"""
TaskWave - URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from . import billing_views

router = DefaultRouter()
router.register(r"workspaces", views.WorkspaceViewSet, basename="workspace")
router.register(r"notifications", views.NotificationViewSet, basename="notification")

urlpatterns = [
    # Auth
    path("auth/register/", views.register, name="register"),
    path("auth/me/", views.me, name="me"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Billing
    path("billing/checkout/", billing_views.billing_checkout, name="billing-checkout"),
    path("billing/portal/", billing_views.billing_portal, name="billing-portal"),
    path("billing/webhook/", billing_views.billing_webhook, name="billing-webhook"),
    # Workspaces with members
    path(
        "workspaces/<uuid:workspace_id>/members/",
        views.WorkspaceMemberViewSet.as_view({"get": "list", "post": "create"}),
        name="workspace-members",
    ),
    path(
        "workspaces/<uuid:workspace_id>/members/<uuid:pk>/",
        views.WorkspaceMemberViewSet.as_view(
            {"get": "retrieve", "put": "update", "delete": "destroy"}
        ),
        name="workspace-member-detail",
    ),
    # Boards
    path(
        "workspaces/<uuid:workspace_id>/boards/",
        views.BoardViewSet.as_view({"get": "list", "post": "create"}),
        name="boards",
    ),
    path(
        "workspaces/<uuid:workspace_id>/boards/<uuid:pk>/",
        views.BoardViewSet.as_view(
            {"get": "retrieve", "put": "update", "delete": "destroy"}
        ),
        name="board-detail",
    ),
    # Columns
    path(
        "workspaces/<uuid:workspace_id>/boards/<uuid:board_id>/columns/",
        views.ColumnViewSet.as_view({"get": "list", "post": "create"}),
        name="columns",
    ),
    path(
        "workspaces/<uuid:workspace_id>/boards/<uuid:board_id>/columns/<uuid:pk>/",
        views.ColumnViewSet.as_view(
            {"get": "retrieve", "put": "update", "delete": "destroy"}
        ),
        name="column-detail",
    ),
    # Tasks
    path(
        "workspaces/<uuid:workspace_id>/boards/<uuid:board_id>/columns/<uuid:column_id>/tasks/",
        views.TaskViewSet.as_view({"get": "list", "post": "create"}),
        name="tasks",
    ),
    path(
        "workspaces/<uuid:workspace_id>/boards/<uuid:board_id>/columns/<uuid:column_id>/tasks/<uuid:pk>/",
        views.TaskViewSet.as_view(
            {"get": "retrieve", "put": "update", "delete": "destroy"}
        ),
        name="task-detail",
    ),
    path(
        "workspaces/<uuid:workspace_id>/boards/<uuid:board_id>/columns/<uuid:column_id>/tasks/<uuid:pk>/move/",
        views.TaskViewSet.as_view({"put": "move"}),
        name="task-move",
    ),
    # Comments
    path(
        "workspaces/<uuid:workspace_id>/boards/<uuid:board_id>/columns/<uuid:column_id>/tasks/<uuid:task_id>/comments/",
        views.CommentViewSet.as_view({"get": "list", "post": "create"}),
        name="comments",
    ),
    path(
        "workspaces/<uuid:workspace_id>/boards/<uuid:board_id>/columns/<uuid:column_id>/tasks/<uuid:task_id>/comments/<uuid:pk>/",
        views.CommentViewSet.as_view(
            {"get": "retrieve", "put": "update", "delete": "destroy"}
        ),
        name="comment-detail",
    ),
    # API Root
    path("", include(router.urls)),
]
