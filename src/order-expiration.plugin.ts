import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    EventBus,
    ID,
    OrderProcess,
    OrderService,
    OrderStateTransitionEvent,
    SchedulerService,
    ScheduledTask,
    VendurePlugin,
    ConfigService,
} from '@vendure/core';
import { filter } from 'rxjs/operators';

// Extend the OrderStates with a custom "Expired" state
declare module '@vendure/core/dist/service/helpers/order-state-machine/order-state' {
    interface CustomOrderStates {
        Expired: never;
    }
}

const orderExpirationProcess: OrderProcess<'Expired'> = {
    transitions: {
        PaymentSettled: { to: ['Expired', 'Completed'] },
    },
};

@Injectable()
export class OrderExpirationService implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private schedulerService: SchedulerService,
        private configService: ConfigService,
    ) {}

    onApplicationBootstrap() {
        this.eventBus
            .ofType(OrderStateTransitionEvent)
            .pipe(filter(event => event.toState === 'PaymentSettled'))
            .subscribe(event => {
                const taskId = `expire-order-${event.order.id}`;
                const task = new ScheduledTask<{ orderId: ID }>({
                    id: taskId,
                    schedule: new Date(Date.now() + 48 * 60 * 60 * 1000) as any,
                    params: { orderId: event.order.id },
                    execute: async ({ injector, scheduledContext, params }) => {
                        const orderService = injector.get(OrderService);
                        const order = await orderService.findOne(scheduledContext, params.orderId);
                        if (order && order.state !== 'Completed') {
                            await orderService.transitionToState(scheduledContext, params.orderId, 'Expired');
                            await orderService.addNoteToOrder(scheduledContext, {
                                orderId: params.orderId,
                                note: 'Order expired after 48h; no refund',
                            });
                            // TODO: optionally send a follow-up email/SMS
                        }
                    },
                });
                const scheduler: any = this.schedulerService as any;
                const strategy: any = this.configService.schedulerOptions.schedulerStrategy as any;
                strategy.registerTask(task);
                const job = scheduler.createCronJob(task);
                scheduler.jobs.set(task.id, { task, job });
            });
    }
}

@VendurePlugin({
    providers: [OrderExpirationService],
    configuration: config => {
        config.orderOptions = {
            ...config.orderOptions,
            process: [...(config.orderOptions?.process ?? []), orderExpirationProcess],
        };
        return config;
    },
})
export class OrderExpirationPlugin {}

