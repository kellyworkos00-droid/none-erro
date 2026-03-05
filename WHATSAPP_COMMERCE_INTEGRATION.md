# Kelly OS - WhatsApp Commerce Integration Module

## 🚀 Overview

The **WhatsApp Commerce Integration Module** transforms Kelly OS into a powerful platform that seamlessly connects e-commerce operations with WhatsApp Business. This module enables businesses to:

- **Connect their e-commerce stores** (WooCommerce, Shopify, or custom platforms) directly to WhatsApp
- **Showcase products** through WhatsApp Business catalogs
- **Receive and manage orders** via WhatsApp
- **Automate customer notifications** (order confirmations, shipping updates, payment reminders)
- **Centralize all operations** through the Kelly OS admin dashboard

---

## 📋 Table of Contents

1. [Key Features](#key-features)
2. [System Architecture](#system-architecture)
3. [Setup Instructions](#setup-instructions)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [User Guide](#user-guide)
7. [Integration Examples](#integration-examples)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Key Features

### 1. **WhatsApp Store Integration**
- Connect WhatsApp Business number via WhatsApp Business API
- Display online stores directly in WhatsApp conversations
- Send automated store messages with product categories
- Provide direct links to full e-commerce website

### 2. **E-Commerce Platform Support**
- **WooCommerce** - Full REST API integration
- **Shopify** - Admin API integration
- **Custom Platforms** - Flexible API integration via webhooks

### 3. **Product Catalog Synchronization**
- Automatic product sync from connected store
- Real-time inventory updates
- Price synchronization
- Product image management
- Category organization

### 4. **Order Management**
- Receive orders from website automatically
- WhatsApp-initiated orders support
- Order status tracking
- Customer information management
- Delivery coordination

### 5. **Automated Notifications**
- Order confirmation messages
- Payment confirmation alerts
- Shipping updates
- Invoice reminders
- Promotional campaigns

### 6. **Centralized Dashboard**
- Monitor all WhatsApp commerce activity
- View order statistics
- Track sync status
- Manage product catalog
- Configure automated messages
- Generate business reports

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Kelly OS Admin Dashboard                  │
│    (WhatsApp Commerce Integration Control Panel)             │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼─────┐ ┌───────▼────────┐
│  WhatsApp      │ │  Product │ │  Order         │
│  Business API  │ │  Sync    │ │  Management    │
└───────┬────────┘ └────┬─────┘ └───────┬────────┘
        │                │                │
        │         ┌──────▼──────┐        │
        │         │   Kelly OS  │        │
        │         │   Database  │        │
        │         └──────┬──────┘        │
        │                │                │
┌───────▼────────────────▼────────────────▼───────┐
│          E-Commerce Store Integration             │
│     (WooCommerce / Shopify / Custom API)         │
└───────────────────────────────────────────────────┘
```

### Data Flow:

1. **Product Sync**: E-Commerce Store → Kelly OS → WhatsApp Catalog
2. **Order Placement**: Customer Order (Website) → Kelly OS → WhatsApp Notification
3. **WhatsApp Orders**: Customer (WhatsApp) → Kelly OS → Order Record
4. **Notifications**: Kelly OS → WhatsApp Business API → Customer

---

## 🛠️ Setup Instructions

### Prerequisites

1. **WhatsApp Business Account**
   - Verified WhatsApp Business account
   - WhatsApp Business API access (via providers like Twilio, 360dialog, or Facebook)
   - API credentials ready

2. **E-Commerce Store**
   - Active online store (WooCommerce, Shopify, or custom)
   - API access enabled
   - API keys generated

3. **Kelly OS Installation**
   - Kelly OS installed and running
   - Admin access to dashboard
   - Database connection configured

### Step 1: Database Migration

Run the Prisma migration to create WhatsApp Commerce tables:

```bash
# Navigate to project directory
cd elegante-main

# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_whatsapp_commerce

# Or push schema changes (for development)
npx prisma db push
```

This creates the following tables:
- `whatsapp_commerce_settings` - Integration configuration
- `whatsapp_orders` - Orders from WhatsApp
- `whatsapp_messages` - Message logs
- `whatsapp_catalog` - Product catalog sync

### Step 2: Access Integration Dashboard

1. Log in to Kelly OS admin dashboard
2. Navigate to **WhatsApp Commerce** from the sidebar
3. Click **"Setup Integration"**

### Step 3: Configure WhatsApp Business

Fill in the WhatsApp Business configuration:

- **WhatsApp Business Number**: Your business number (format: `254712345678`)
- **WhatsApp API Key**: From your WhatsApp Business API provider
- **Webhook URL**: `https://yourdomain.com/api/whatsapp/webhook`

### Step 4: Connect E-Commerce Store

#### For WooCommerce:

1. In WooCommerce Admin, go to: **WooCommerce → Settings → Advanced → REST API**
2. Click **"Add Key"**
3. Set permissions to **Read/Write**
4. Copy **Consumer Key** and **Consumer Secret**
5. In Kelly OS:
   - Store Type: `WooCommerce`
   - Store URL: `https://yourstore.com`
   - API Key: [Consumer Key]
   - API Secret: [Consumer Secret]

#### For Shopify:

1. In Shopify Admin, go to: **Apps → Develop apps**
2. Create a new app
3. Configure **Admin API** access
4. Generate **Admin API access token**
5. In Kelly OS:
   - Store Type: `Shopify`
   - Store URL: `https://yourstore.myshopify.com`
   - API Key: [Admin API access token]

#### For Custom Platform:

1. Ensure your platform has REST API or webhook support
2. Generate API credentials
3. In Kelly OS:
   - Store Type: `Custom`
   - Store URL: `https://yourstore.com`
   - API Key: [Your API key]
   - API Secret: [Your API secret]

### Step 5: Configure Automation

- **Auto-Sync**: Enable automatic product synchronization
- **Sync Interval**: Set sync frequency (recommended: 30 minutes)
- **Auto-Notifications**: Enable automated WhatsApp messages
- **WhatsApp Catalog**: Enable product catalog in WhatsApp

### Step 6: Test Connection

Click **"Test Connection"** to verify:
- WhatsApp API connectivity
- Store API authentication
- Data retrieval capability

### Step 7: Sync Products

Click **"Sync Now"** to trigger initial product sync:
- Fetches products from your store
- Creates WhatsApp catalog entries
- Updates inventory levels

---

## 🗄️ Database Schema

### WhatsAppCommerceSettings

Stores integration configuration for each organization.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| organizationId | String | Organization identifier |
| whatsappNumber | String | WhatsApp Business number |
| whatsappApiKey | String | API key for WhatsApp |
| whatsappWebhookUrl | String | Webhook endpoint |
| storeType | String | woocommerce, shopify, custom |
| storeUrl | String | E-commerce store URL |
| storeApiKey | String | Store API key |
| storeApiSecret | String | Store API secret |
| autoSyncEnabled | Boolean | Enable auto sync |
| syncInterval | Int | Sync frequency (minutes) |
| autoNotificationsEnabled | Boolean | Enable auto messages |
| catalogEnabled | Boolean | Enable WhatsApp catalog |
| isConnected | Boolean | Connection status |
| lastSyncAt | DateTime | Last sync timestamp |
| lastSyncStatus | String | success, error, pending |

### WhatsAppOrder

Stores orders received via WhatsApp or synced from website.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| orderNumber | String | Unique order number |
| customerName | String | Customer full name |
| customerPhone | String | Customer phone number |
| customerEmail | String | Customer email (optional) |
| products | JSON | Array of order items |
| totalAmount | Float | Order total |
| status | String | Order status |
| deliveryAddress | String | Delivery address |
| paymentMethod | String | Payment method used |
| paymentStatus | String | Payment status |
| paidAmount | Float | Amount paid |
| orderDate | DateTime | Order creation date |

### WhatsAppMessage

Logs all WhatsApp messages sent by the system.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| messageType | String | Type of message |
| recipientPhone | String | Recipient phone number |
| recipientName | String | Recipient name |
| body | String | Message content |
| status | String | Sending status |
| sentAt | DateTime | Send timestamp |
| deliveredAt | DateTime | Delivery timestamp |
| readAt | DateTime | Read timestamp |
| orderId | String | Related order ID |
| whatsappMessageId | String | WhatsApp message ID |

### WhatsAppCatalog

Manages product catalog for WhatsApp Business.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| productId | String | Kelly OS product ID |
| whatsappCatalogId | String | WhatsApp catalog ID |
| catalogName | String | Product name |
| catalogSku | String | Product SKU |
| catalogPrice | Float | Product price |
| catalogDescription | String | Product description |
| catalogImageUrl | String | Product image URL |
| catalogCategory | String | Product category |
| isSynced | Boolean | Sync status |
| lastSyncedAt | DateTime | Last sync time |
| isAvailable | Boolean | Availability status |
| stockQuantity | Int | Stock quantity |

---

## 🔌 API Endpoints

### Settings Management

#### GET `/api/whatsapp-commerce/settings`
Retrieve integration settings for the current organization.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "whatsappNumber": "254712345678",
    "storeType": "woocommerce",
    "storeUrl": "https://yourstore.com",
    "isConnected": true,
    "lastSyncAt": "2026-03-05T10:30:00Z"
  }
}
```

#### POST `/api/whatsapp-commerce/settings`
Create or update integration settings.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "whatsappNumber": "254712345678",
  "whatsappApiKey": "your-api-key",
  "storeType": "woocommerce",
  "storeUrl": "https://yourstore.com",
  "storeApiKey": "consumer-key",
  "storeApiSecret": "consumer-secret",
  "autoSyncEnabled": true,
  "syncInterval": 30
}
```

### Statistics

#### GET `/api/whatsapp-commerce/stats`
Get WhatsApp Commerce statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProducts": 150,
    "syncedProducts": 145,
    "totalOrders": 89,
    "pendingOrders": 12,
    "messagesSent": 234,
    "lastSyncStatus": "success"
  }
}
```

### Product Sync

#### POST `/api/whatsapp-commerce/sync`
Trigger manual product sync from e-commerce store.

**Response:**
```json
{
  "success": true,
  "data": {
    "syncedAt": "2026-03-05T11:45:00Z",
    "status": "success"
  }
}
```

### Connection Test

#### POST `/api/whatsapp-commerce/test-connection`
Test WhatsApp and store API connections.

**Body:**
```json
{
  "whatsappNumber": "254712345678",
  "whatsappApiKey": "api-key",
  "storeType": "woocommerce",
  "storeUrl": "https://yourstore.com",
  "storeApiKey": "consumer-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "whatsapp": {
      "status": "success",
      "message": "WhatsApp API connection successful"
    },
    "store": {
      "status": "success",
      "message": "WooCommerce store connection successful"
    }
  }
}
```

---

## 👥 User Guide

### For Business Administrators

#### Setting Up Integration

1. **Access Dashboard**: Navigate to **WhatsApp Commerce** from the main menu
2. **Review Status**: Check connection status on overview page
3. **Setup**: Click **"Setup Integration"** button
4. **Configure**: Fill in all required fields
5. **Test**: Click **"Test Connection"** to verify settings
6. **Save**: Click **"Save Integration Settings"**
7. **Sync**: Initiate first product sync

#### Managing Products

1. Navigate to **WhatsApp Commerce → Catalog**
2. View synced products
3. Check sync status for each product
4. Manually trigger sync if needed
5. Update product availability

#### Viewing Orders

1. Navigate to **WhatsApp Commerce → Orders**
2. View all WhatsApp-originated orders
3. Filter by status (pending, confirmed, shipped)
4. Update order status
5. Track delivery progress

#### Configuring Messages

1. Navigate to **WhatsApp Commerce → Messages**
2. View message templates
3. Customize message content
4. Set automation rules
5. Test message sending

### For Customers

#### Browsing Products

When customers message the business WhatsApp number:

```
Customer: Hi
Business (Auto-reply):
Welcome to [Business Name]!

View our products:
• Category 1
• Category 2
• Category 3

Visit our full store: yourstore.com

How can we help you today?
```

#### Placing Orders

Customers can order via:

1. **Website**: Place order on e-commerce site → Automatic WhatsApp confirmation
2. **WhatsApp**: Send product request → Business processes → Confirmation sent

#### Order Tracking

After placing an order, customers receive:

1. **Order Confirmation**: Order details and number
2. **Payment Confirmation**: Payment received notification
3. **Shipping Update**: Tracking information
4. **Delivery Confirmation**: Order delivered message

---

## 🔧 Integration Examples

### WooCommerce Webhook

Configure WooCommerce to send order data to Kelly OS:

```php
// In WooCommerce functions.php
add_action('woocommerce_new_order', 'send_order_to_kelly_os', 10, 1);

function send_order_to_kelly_os($order_id) {
    $order = wc_get_order($order_id);
    
    $data = [
        'orderNumber' => $order->get_order_number(),
        'customerName' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
        'customerPhone' => $order->get_billing_phone(),
        'customerEmail' => $order->get_billing_email(),
        'totalAmount' => $order->get_total(),
        'products' => []
    ];
    
    foreach($order->get_items() as $item) {
        $data['products'][] = [
            'name' => $item->get_name(),
            'quantity' => $item->get_quantity(),
            'price' => $item->get_total()
        ];
    }
    
    wp_remote_post('https://yourdomain.com/api/whatsapp-commerce/orders/webhook', [
        'body' => json_encode($data),
        'headers' => [
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer YOUR_API_KEY'
        ]
    ]);
}
```

### Shopify Webhook

Configure Shopify webhook in Admin:

1. **Settings → Notifications → Webhooks**
2. **Event**: Order creation
3. **Format**: JSON
4. **URL**: `https://yourdomain.com/api/whatsapp-commerce/orders/webhook`

---

## 🛠️ Troubleshooting

### Common Issues

#### "Connection Test Failed"

**Possible Causes:**
- Invalid API credentials
- Incorrect store URL
- Firewall blocking requests
- API permissions insufficient

**Solutions:**
1. Verify API keys are correct
2. Check store URL format (must include https://)
3. Ensure API has Read/Write permissions
4. Check server firewall settings

#### "Product Sync Not Working"

**Possible Causes:**
- Auto-sync disabled
- API rate limits exceeded
- Store API down
- Network connectivity issues

**Solutions:**
1. Enable auto-sync in settings
2. Increase sync interval
3. Check store API status
4. Manually trigger sync
5. Review sync logs

#### "WhatsApp Messages Not Sending"

**Possible Causes:**
- Invalid WhatsApp API key
- Phone number not verified
- Message template not approved
- API quota exceeded

**Solutions:**
1. Verify WhatsApp API credentials
2. Check phone number verification status
3. Submit message templates for approval
4. Monitor API usage limits
5. Contact WhatsApp Business API provider

### Debug Mode

Enable debug logging in `.env`:

```env
WHATSAPP_COMMERCE_DEBUG=true
LOG_LEVEL=debug
```

View logs:
```bash
# View application logs
npm run logs

# View specific WhatsApp commerce logs
grep "whatsapp-commerce" logs/application.log
```

---

## 📊 Best Practices

### Security

1. **API Keys**: Store securely, never commit to version control
2. **Webhook Authentication**: Use Bearer tokens for webhook endpoints
3. **Data Encryption**: Enable SSL/TLS for all API communications
4. **Access Control**: Limit admin dashboard access to authorized users

### Performance

1. **Sync Frequency**: Balance between freshness and API limits
2. **Caching**: Cache product data to reduce API calls
3. **Batch Operations**: Process multiple products in single API requests
4. **Database Indexing**: Ensure proper indexes on frequently queried fields

### Customer Experience

1. **Response Time**: Aim for immediate automated responses
2. **Message Clarity**: Use clear, professional language
3. **Order Tracking**: Provide real-time order status updates
4. **Support**: Have staff monitor WhatsApp for customer inquiries

---

## 🚀 Future Enhancements

1. **Multi-Store Management**: Support multiple stores per organization
2. **Advanced Analytics**: Customer behavior analysis and sales insights
3. **AI Chatbot**: Automated customer service with natural language processing
4. **Payment Integration**: Direct M-Pesa and card payments via WhatsApp
5. **Multi-Language**: Support for multiple languages
6. **Product Recommendations**: AI-powered product suggestions
7. **Loyalty Programs**: Integration with loyalty and rewards systems
8. **Marketplace**: Connect multiple Kelly OS businesses in WhatsApp marketplace

---

## 📞 Support

For technical support or questions:
- **Documentation**: Review this guide and API documentation
- **Community**: Join Kelly OS community forum
- **Support Team**: Contact Kelly OS support
- **WhatsApp Business API**: Contact your API provider for WhatsApp-specific issues

---

**Built with ❤️ for Kelly OS - Transforming Business Operations Through Integrated Commerce**
