# Ability Palette

Ability Palette is an experimental WordPress plugin that explores using the WordPress Abilities API as a source of reusable capabilities and exposing selected Abilities through the WordPress Command Palette.

The plugin uses WooCommerce as a practical example.

It registers:

`ability-palette/get-orders-needing-attention`

The Ability returns the number of WooCommerce orders currently:

- Processing
- On hold

It can be executed independently as a WordPress Ability and, through a generic adapter, from the WordPress Command Palette.

## Requirements

- WordPress 7.1+
- WooCommerce
- A user with `manage_woocommerce` to execute the example Ability

## What this experiment demonstrates

```text
WooCommerce
  → WordPress Ability
  → Client-side Abilities API
  → generic Ability/Commands adapter
  → Command Palette
  → generic structured result modal
```

The adapter contains no WooCommerce-specific logic. The important architectural idea is to define a capability once, then allow different consumers to execute it. The Command Palette is only one possible consumer.

## Tutorial

The `tutorial` branch contains a clean, linear history for the accompanying article.

### Step 1 — Register the Ability

Tag: `tutorial/step-01-ability`

This stage contains only the WooCommerce Ability. Before any Command Palette integration exists, readers can inspect the registered Ability using WordPress's Abilities Explorer.

### Step 2 — Connect it to the Command Palette

Tag: `tutorial/step-02-command-adapter`

Introduces the generic Ability → Commands adapter and the `command-palette` category opt-in.

### Step 3 — Execute the Ability

Tag: `tutorial/step-03-command-execution`

Executes the Ability through `@wordpress/abilities` from the Command Palette.

### Step 4 — Add execution feedback

Tag: `tutorial/step-04-result-feedback`

Adds WordPress notices and the classic wp-admin snackbar fallback.

### Step 5 — Render structured results

Tag: `tutorial/step-05-result-modal`

Adds the generic result modal and uses the Ability's `output_schema` as presentation hints.

## Following the tutorial

Start on the tutorial branch and list its checkpoints:

```sh
git switch tutorial
git tag
```

To inspect a specific checkpoint:

```sh
git switch --detach tutorial/step-01-ability
```

To return to the complete tutorial:

```sh
git switch tutorial
```

Move through the tags sequentially as you follow the article.

## Current example

```json
{
  "processing": 0,
  "on_hold": 0
}
```

Actual values depend on the WooCommerce store.

## Architecture

```text
WooCommerce
    ↓
Ability
    ↓
┌────┴─────────────┐
↓                  ↓
Abilities       Command
Explorer        Palette
                    ↓
                Result Modal
```

Other consumers, such as workflows, REST clients, or AI/MCP integrations, could potentially consume the same Ability without moving that logic into the Command Palette adapter.

## Status

Ability Palette is experimental and was created as part of research into the WordPress 7.1 Abilities and Commands APIs. It is not a production WooCommerce plugin.
