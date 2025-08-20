import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PluginCommonModule, VendurePlugin, EventBus, OrderStateTransitionEvent } from '@vendure/core';
import { EmailService } from '@vendure/email-plugin';

/**
 * Sends a pickup notification when an order is paid or fulfilled.
 */
@Injectable()
class PickupNotificationService implements OnApplicationBootstrap {
    constructor(private eventBus: EventBus, private emailService: EmailService) {}

    onApplicationBootstrap() {
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
            if (event.toState === 'PaymentSettled' || event.toState === 'Fulfilled') {
                const order = event.order;
                const emailAddress = order.customer?.emailAddress;
                if (emailAddress) {
                    const pickupAddress = process.env.PICKUP_ADDRESS ?? '123 Flower St.';
                    const subject = `Order ${order.code} ready for pickup`;
                    const body = `<p>Your order <strong>${order.code}</strong> is ready for pickup at ${pickupAddress}. Please collect within 48 hours.</p>`;
                    await this.emailService.send({
                        recipient: emailAddress,
                        subject,
                        body,
                    });
                }
            }
        });
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [PickupNotificationService],
})
export class PickupNotificationPlugin {}

