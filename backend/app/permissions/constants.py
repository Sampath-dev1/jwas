# Standard permissions for JWAS
PERMISSIONS = [
    ("products.read", "View products"),
    ("products.create", "Create products"),
    ("products.update", "Update products"),
    ("products.publish", "Publish or unpublish products"),
    ("products.archive", "Archive products"),
    ("categories.read", "View categories"),
    ("categories.create", "Create categories"),
    ("categories.update", "Update categories"),
    ("categories.publish", "Publish or unpublish categories"),
    ("inventory.read", "View inventory"),
    ("inventory.adjust", "Adjust inventory quantities"),
    ("orders.read", "View orders and details"),
    ("orders.update", "Update order status and tracking"),
    ("payments.read", "View payment details"),
    ("refunds.create", "Initiate refunds"),
    ("refunds.approve", "Approve and process refunds"),
    ("customers.read", "View customer profiles and history"),
    ("promotions.manage", "Manage coupons and homepage banners"),
    ("reports.read", "View analytics and reports"),
    ("staff.manage", "Manage staff accounts"),
    ("roles.manage", "Manage roles and permissions"),
    ("settings.manage", "Manage website and business settings"),
    ("audit_logs.read", "View audit trail logs"),
]

ROLE_DEFINITIONS = {
    "Super Admin": [p[0] for p in PERMISSIONS],
    "Catalogue Manager": [
        "products.read", "products.create", "products.update", "products.publish", "products.archive",
        "categories.read", "categories.create", "categories.update", "categories.publish"
    ],
    "Inventory Manager": [
        "products.read", "inventory.read", "inventory.adjust"
    ],
    "Order Manager": [
        "orders.read", "orders.update", "payments.read", "refunds.create", "customers.read"
    ],
    "Marketing Manager": [
        "promotions.manage", "settings.manage", "categories.read", "products.read"
    ],
    "Customer Support": [
        "customers.read", "orders.read", "refunds.create", "products.read"
    ],
    "Reports Viewer": [
        "reports.read"
    ]
}
