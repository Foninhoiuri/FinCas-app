<page url="/docs/react/components/badge">
# Badge

**Category**: react
**URL**: https://www.heroui.com/docs/react/components/badge
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/react/components/(data-display)/badge.mdx
> Displays a small indicator positioned relative to another element, commonly used for notification counts, status dots, and labels


## Import

```tsx
import { Badge } from '@heroui/react';

```

## Anatomy

Badge is designed to be positioned relative to another element using `Badge.Anchor`. Plain-text children are automatically wrapped in `<Badge.Label>`.

> For standalone label usage, use the [Chip](/docs/react/components/chip) component instead.

```tsx
<Badge.Anchor>
  <Avatar />
  <Badge color="danger">5</Badge>
</Badge.Anchor>

```

### Usage

```tsx
import {Avatar, Badge} from "@heroui/react";

const GREEN_AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";
const ORANGE_AVATAR_URL =
  "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg";
const BLUE_AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg";

export function BadgeBasic() {
  return (
    <div className="flex items-center gap-6">
      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={GREEN_AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="danger" size="sm">
          5
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={ORANGE_AVATAR_URL} />
          <Avatar.Fallback>AB</Avatar.Fallback>
        </Avatar>
        <Badge color="accent" size="sm">
          New
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={BLUE_AVATAR_URL} />
          <Avatar.Fallback>CD</Avatar.Fallback>
        </Avatar>
        <Badge color="success" placement="bottom-right" size="sm" />
      </Badge.Anchor>
    </div>
  );
}

```

### Colors

```tsx
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeColors() {
  const colors = ["default", "accent", "success", "warning", "danger"] as const;

  return (
    <div className="flex items-center gap-6">
      {colors.map((color) => (
        <Badge.Anchor key={color}>
          <Avatar>
            <Avatar.Image src={AVATAR_URL} />
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar>
          <Badge color={color} size="sm" />
        </Badge.Anchor>
      ))}
    </div>
  );
}

```

### Sizes

```tsx
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeSizes() {
  const sizes = ["sm", "md", "lg"] as const;

  return (
    <div className="flex items-center gap-6">
      {sizes.map((size) => (
        <Badge.Anchor key={size}>
          <Avatar size={size}>
            <Avatar.Image src={AVATAR_URL} />
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar>
          <Badge color="danger" size={size}>
            5
          </Badge>
        </Badge.Anchor>
      ))}
    </div>
  );
}

```

### Variants

```tsx
import {Avatar, Badge, Separator} from "@heroui/react";
import React from "react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeVariants() {
  const variants = ["primary", "secondary", "soft"] as const;
  const colors = ["accent", "default", "success", "warning", "danger"] as const;

  return (
    <div className="flex flex-col gap-8">
      {variants.map((variant, index) => (
        <React.Fragment key={variant}>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-muted capitalize">{variant}</h3>
            <div className="flex items-center gap-6">
              {colors.map((color) => (
                <Badge.Anchor key={color}>
                  <Avatar>
                    <Avatar.Image src={AVATAR_URL} />
                    <Avatar.Fallback>JD</Avatar.Fallback>
                  </Avatar>
                  <Badge color={color} size="sm" variant={variant}>
                    5
                  </Badge>
                </Badge.Anchor>
              ))}
            </div>
          </div>
          {index < variants.length - 1 && <Separator />}
        </React.Fragment>
      ))}
    </div>
  );
}

```

### Placements

```tsx
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgePlacements() {
  const placements = ["top-right", "top-left", "bottom-right", "bottom-left"] as const;

  return (
    <div className="flex items-center gap-8">
      {placements.map((placement) => (
        <div key={placement} className="flex flex-col items-center gap-2">
          <Badge.Anchor>
            <Avatar>
              <Avatar.Image src={AVATAR_URL} />
              <Avatar.Fallback>JD</Avatar.Fallback>
            </Avatar>
            <Badge color="accent" placement={placement} size="sm" />
          </Badge.Anchor>
          <span className="text-xs text-muted">{placement}</span>
        </div>
      ))}
    </div>
  );
}

```

### With Content

Badge supports text, numbers, and icons as content. When no children are provided, it renders as a dot indicator.

```tsx
import {Bell} from "@gravity-ui/icons";
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeWithContent() {
  return (
    <div className="flex items-center gap-6">
      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="danger" size="sm">
          5
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="danger" size="sm">
          New
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="danger" size="sm">
          99+
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Image src={AVATAR_URL} />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar>
        <Badge color="accent" size="sm">
          <Bell className="size-2.5" />
        </Badge>
      </Badge.Anchor>
    </div>
  );
}

```

### Dot Badge

Empty badges act as status indicators — useful for online/offline states or activity signals.

```tsx
import {Avatar, Badge} from "@heroui/react";

const AVATAR_URL = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";

export function BadgeDot() {
  const colors = ["accent", "success", "warning", "danger"] as const;

  return (
    <div className="flex items-center gap-6">
      {colors.map((color) => (
        <Badge.Anchor key={color}>
          <Avatar>
            <Avatar.Image src={AVATAR_URL} />
            <Avatar.Fallback>JD</Avatar.Fallback>
          </Avatar>
          <Badge color={color} placement="bottom-right" size="sm" />
        </Badge.Anchor>
      ))}
    </div>
  );
}

```

## Related Components

* **Avatar**: Display user profile images
* **Chip**: Compact elements for tags and filters

## Styling

### Passing Tailwind CSS classes

You can style the root container and individual slots:

```tsx
import {Badge, Avatar} from '@heroui/react';

function CustomBadge() {
  return (
    <Badge.Anchor>
      <Avatar />
      <Badge className="border-2 border-white" color="danger">
        <Badge.Label className="font-bold">99+</Badge.Label>
      </Badge>
    </Badge.Anchor>
  );
}

```

### Customizing the component classes

To customize the Badge component classes, you can use the `@layer components` directive.
<br />[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
  .badge {
    @apply rounded-full text-xs;
  }

  .badge__label {
    @apply font-semibold;
  }

  .badge--accent {
    @apply shadow-sm;
  }
}

```

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Badge component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/badge.css)):

#### Base Classes

* `.badge` - Base badge container styles
* `.badge__label` - Label text slot styles
* `.badge-anchor` - Positioning wrapper for the anchored element

#### Color Classes

* `.badge--accent` - Accent color variant
* `.badge--danger` - Danger color variant
* `.badge--default` - Default color variant
* `.badge--success` - Success color variant
* `.badge--warning` - Warning color variant

#### Variant Classes

* `.badge--primary` - Primary variant with filled background
* `.badge--secondary` - Secondary variant with default background
* `.badge--soft` - Soft variant with lighter background

#### Size Classes

* `.badge--sm` - Small size
* `.badge--md` - Medium size (default)
* `.badge--lg` - Large size

#### Placement Classes

* `.badge--top-right` - Position at top-right corner (default)
* `.badge--top-left` - Position at top-left corner
* `.badge--bottom-right` - Position at bottom-right corner
* `.badge--bottom-left` - Position at bottom-left corner

#### Compound Variant Classes

Badges support combining variant and color classes (e.g., `.badge--primary.badge--accent`). The following combinations have default styles defined:

**Primary Variants:**

* `.badge--primary.badge--accent` - Primary accent with filled background
* `.badge--primary.badge--default` - Primary default with filled background
* `.badge--primary.badge--success` - Primary success with filled background
* `.badge--primary.badge--warning` - Primary warning with filled background
* `.badge--primary.badge--danger` - Primary danger with filled background

**Soft Variants:**

* `.badge--soft.badge--accent` - Soft accent with lighter background
* `.badge--soft.badge--default` - Soft default with lighter background
* `.badge--soft.badge--success` - Soft success with lighter background
* `.badge--soft.badge--warning` - Soft warning with lighter background
* `.badge--soft.badge--danger` - Soft danger with lighter background

## API Reference

### Badge Props

| Prop        | Type                                                           | Default       | Description                                                                                  |
| ----------- | -------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| `children`  | `React.ReactNode`                                              | -             | Content to display inside the badge (text, number, or icon). When omitted, renders as a dot. |
| `className` | `string`                                                       | -             | Additional CSS classes for the root element                                                  |
| `color`     | `"default" \| "accent" \| "success" \| "warning" \| "danger"`  | `"default"`   | Color variant of the badge                                                                   |
| `variant`   | `"primary" \| "secondary" \| "soft"`                           | `"primary"`   | Visual style variant                                                                         |
| `size`      | `"sm" \| "md" \| "lg"`                                         | `"md"`        | Size of the badge                                                                            |
| `placement` | `"top-right" \| "top-left" \| "bottom-right" \| "bottom-left"` | `"top-right"` | Position of the badge relative to its anchor                                                 |

### Badge.Anchor Props

| Prop        | Type              | Default | Description                                               |
| ----------- | ----------------- | ------- | --------------------------------------------------------- |
| `children`  | `React.ReactNode` | -       | The element to anchor the badge to, plus the Badge itself |
| `className` | `string`          | -       | Additional CSS classes for the anchor wrapper             |

### Badge.Label Props

| Prop        | Type              | Default | Description                               |
| ----------- | ----------------- | ------- | ----------------------------------------- |
| `children`  | `React.ReactNode` | -       | Label text content                        |
| `className` | `string`          | -       | Additional CSS classes for the label slot |

</page>