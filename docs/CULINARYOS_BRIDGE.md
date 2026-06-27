# 🍽️ CulinaryOS ↔ Sigil Bridge

This guide covers connecting your CulinaryOS instance to Sigil so your Discord server can display menus, look up recipes, view inventory, and receive real-time low-stock alerts.

---

## How It Works

```
 CulinaryOS Backend
        │
        │  REST API (pull)     ─── /menu today, /recipe get, /inventory status
        │  Webhook (push)      ─── low-stock alerts, menu updates, new recipes
        ▼
   Sigil Bot  ──────────────▶  Discord Channel
```

Sigil **pulls** from CulinaryOS when users run commands.
CulinaryOS **pushes** to Sigil when inventory drops below thresholds.

---

## Setup — Sigil Side

### 1. Add to `.env`

```env
CULINARYOS_API_URL=https://your-culinaryos-host
CULINARYOS_API_KEY=your_api_key_here
CULINARYOS_WEBHOOK_SECRET=your_shared_secret_here
```

### 2. Run `/menu setup` in Discord

```
/menu setup
  api_url: https://your-culinaryos-host
  api_key: (optional — set if CulinaryOS requires one)
  menu_channel: #daily-menu
  alert_channel: #kitchen-alerts
```

This saves the connection config for your server. Any admin with **Manage Server** can run this.

### 3. Register the Webhook in `index.js`

Add this to your Sigil `src/index.js` after your Express app is created:

```js
const culinaryWebhook = require('./webhooks/culinaryos.js');
culinaryWebhook.register(app, client);
```

---

## Setup — CulinaryOS Side

In your CulinaryOS backend, configure the outbound webhook to POST to:

```
POST https://your-sigil-host/webhook/trigger
Header: X-Sigil-Secret: your_shared_secret_here
Content-Type: application/json
```

### Supported Event Payloads

#### `inventory.low` / `inventory.critical` / `inventory.out`
```json
{
  "event": "inventory.low",
  "guild_id": "optional — omit to broadcast to all guilds",
  "data": [
    {
      "name": "Chicken Breast",
      "quantity": 5,
      "unit": "lbs",
      "reorderLevel": 20,
      "status": "low"
    }
  ]
}
```

#### `menu.published`
```json
{
  "event": "menu.published",
  "data": {
    "message": "Today's menu is live — featuring pan-seared salmon and beef tenderloin."
  }
}
```

#### `recipe.added`
```json
{
  "event": "recipe.added",
  "data": {
    "name": "Herb Crusted Salmon",
    "description": "Fresh Atlantic salmon with herb crust and lemon butter sauce."
  }
}
```

#### `order.alert`
```json
{
  "event": "order.alert",
  "data": {
    "message": "Table 7 order #1042 flagged for allergy review."
  }
}
```

---

## Discord Commands

| Command | Who | Description |
|---|---|---|
| `/menu setup` | Admin | Connect CulinaryOS API |
| `/menu today` | Anyone | Show today's full menu, optionally filtered by category |
| `/menu specials` | Anyone | Show today's specials only |
| `/menu item [name]` | Anyone | Look up a specific menu item with allergens, price, calories |
| `/recipe search [query]` | Anyone | Search recipes by name or ingredient |
| `/recipe get [name]` | Anyone | Full recipe with ingredients and steps |
| `/recipe random` | Anyone | Pull a random recipe from CulinaryOS |
| `/inventory status` | Admin | Full inventory with stock levels |
| `/inventory item [name]` | Admin | Look up a specific inventory item |
| `/inventory alerts` | Admin | All current low/critical/out alerts |

---

## API Contract

Sigil expects the following endpoints on your CulinaryOS backend:

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/menu/today` | Array of menu items |
| `GET` | `/api/menu/specials` | Array of specials |
| `GET` | `/api/menu/search?q=` | Array of matching items |
| `GET` | `/api/recipes/search?q=` | Array of recipes |
| `GET` | `/api/recipes/random` | Single recipe |
| `GET` | `/api/inventory` | Array of inventory items |
| `GET` | `/api/inventory?status=low` | Filtered inventory |
| `GET` | `/api/inventory/search?q=` | Search inventory |
| `GET` | `/api/inventory/alerts` | All alert-level items |

All responses can be either a plain array `[...]` or a wrapper object with any of these keys: `items`, `results`, `menu`, `recipes`, `inventory`, `alerts`, `specials`.

---

## Item Shapes

### Menu Item
```json
{
  "name": "Pan Seared Salmon",
  "category": "Entrees",
  "description": "Fresh Atlantic salmon, herb butter, roasted vegetables",
  "price": 24.99,
  "allergens": ["Fish", "Dairy"],
  "calories": 520
}
```

### Recipe
```json
{
  "name": "Herb Crusted Salmon",
  "description": "...",
  "prepTime": "15 min",
  "cookTime": "20 min",
  "servings": 4,
  "calories": 480,
  "cost": 12.50,
  "ingredients": [
    { "quantity": "4", "unit": "fillets", "name": "salmon" },
    { "quantity": "2", "unit": "tbsp", "name": "fresh dill" }
  ],
  "steps": [
    "Preheat oven to 400°F.",
    "Mix herb crust and press onto salmon.",
    "Bake 18-20 minutes."
  ],
  "allergens": ["Fish"],
  "tags": ["seafood", "gluten-free"]
}
```

### Inventory Item
```json
{
  "name": "Chicken Breast",
  "quantity": 5,
  "unit": "lbs",
  "reorderLevel": 20,
  "status": "low",
  "supplier": "Local Farm Co.",
  "lastUpdated": "2026-06-19T20:00:00Z"
}
```

`status` values: `ok` · `low` · `critical` · `very_low` · `out` · `out_of_stock`

---

*Part of the [Sigil](https://github.com/ShadowWalkerNC/Sigil) ecosystem.*
