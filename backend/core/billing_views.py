"""
TaskWave - Stripe billing views
"""

import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .billing import (
    create_checkout_session,
    create_portal_session,
    sync_user_from_subscription,
)

User = get_user_model()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def billing_checkout(request):
    """Create a Stripe Checkout Session for the Pro plan."""
    if not settings.STRIPE_SECRET_KEY:
        return Response(
            {"error": "Stripe non configurato"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    user = request.user
    if user.plan_tier in ("pro", "business") and user.subscription_status in (
        "active",
        "trialing",
    ):
        return Response(
            {"error": "Hai già un abbonamento attivo"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session = create_checkout_session(user)
        return Response({"url": session.url})
    except stripe.StripeError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def billing_portal(request):
    """Create a Stripe Customer Portal session."""
    if not settings.STRIPE_SECRET_KEY:
        return Response(
            {"error": "Stripe non configurato"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        session = create_portal_session(request.user)
        return Response({"url": session.url})
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.StripeError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def billing_webhook(request):
    """Handle Stripe webhook events."""
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except stripe.SignatureVerificationError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
    else:
        import json

        event = json.loads(payload)

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data_object)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data_object)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data_object)
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(data_object)

    return Response(status=status.HTTP_200_OK)


def _get_user_from_reference(data_object):
    client_reference_id = data_object.get("client_reference_id")
    if client_reference_id:
        try:
            return User.objects.get(id=client_reference_id)
        except User.DoesNotExist:
            pass

    customer_id = data_object.get("customer")
    if customer_id:
        return User.objects.filter(stripe_customer_id=customer_id).first()

    return None


def _handle_checkout_completed(session):
    user = _get_user_from_reference(session)
    if not user:
        return

    customer_id = session.get("customer")
    if customer_id:
        user.stripe_customer_id = customer_id

    subscription_id = session.get("subscription")
    if subscription_id:
        subscription = stripe.Subscription.retrieve(subscription_id)
        sync_user_from_subscription(user, subscription)
    else:
        user.plan_tier = "pro"
        user.subscription_status = "trialing"
        user.save(
            update_fields=["stripe_customer_id", "plan_tier", "subscription_status"]
        )


def _handle_subscription_updated(subscription):
    user = _get_user_from_reference(subscription)
    if user:
        sync_user_from_subscription(user, subscription)


def _handle_subscription_deleted(subscription):
    user = _get_user_from_reference(subscription)
    if not user:
        return

    user.plan_tier = "free"
    user.subscription_status = "free"
    user.save(update_fields=["plan_tier", "subscription_status"])


def _handle_payment_failed(invoice):
    customer_id = invoice.get("customer")
    if not customer_id:
        return

    user = User.objects.filter(stripe_customer_id=customer_id).first()
    if user:
        user.subscription_status = "past_due"
        user.save(update_fields=["subscription_status"])
