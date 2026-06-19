"""
TaskWave - Stripe billing helpers
"""

import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

PRICE_TO_PLAN = {
    settings.STRIPE_PRICE_PRO: "pro",
}


def get_plan_for_price(price_id):
    return PRICE_TO_PLAN.get(price_id, "free")


def sync_user_from_subscription(user, subscription):
    status = subscription.get("status", "free")
    user.subscription_status = status

    items = subscription.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id")
        user.plan_tier = get_plan_for_price(price_id)

    if status in ("canceled", "incomplete_expired"):
        user.plan_tier = "free"
        user.subscription_status = "free"

    user.save(
        update_fields=["subscription_status", "plan_tier", "stripe_customer_id"]
    )


def create_checkout_session(user):
    session_params = {
        "mode": "subscription",
        "line_items": [{"price": settings.STRIPE_PRICE_PRO, "quantity": 1}],
        "subscription_data": {
            "trial_period_days": 14,
            "trial_settings": {
                "end_behavior": {"missing_payment_method": "pause"},
            },
        },
        "payment_method_collection": "if_required",
        "client_reference_id": str(user.id),
        "success_url": f"{settings.FRONTEND_URL}/dashboard?checkout=success",
        "cancel_url": f"{settings.FRONTEND_URL}/pricing?checkout=cancelled",
    }

    if user.stripe_customer_id:
        session_params["customer"] = user.stripe_customer_id
    else:
        session_params["customer_email"] = user.email

    return stripe.checkout.Session.create(**session_params)


def create_portal_session(user):
    if not user.stripe_customer_id:
        raise ValueError("Nessun abbonamento Stripe associato")

    return stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/dashboard",
    )
