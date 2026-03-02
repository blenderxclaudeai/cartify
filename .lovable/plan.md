

## Problem

The prompt treats every product the same way — it always assumes the user is a person who should "wear/use" the product. So when you try on furniture (sofa, lamp, etc.), the AI puts you sitting on the sofa instead of placing the sofa into your room photo. Same issue would happen with pet products, car accessories, garden items, etc.

## Fix

### Category-aware prompt system in `supabase/functions/tryon-request/index.ts`

Instead of one generic prompt, build the prompt dynamically based on the product category. The categories already exist in `CATEGORY_TO_PHOTO` — we'll group them into prompt "modes":

**Mode 1 — Wearable / Personal** (ring, bracelet, necklace, earring, glasses, hat, top, dress, bottom, shoes, bag, nails, hair):
> Image 1 is the customer. Image 2 is a product listing. Extract the product from Image 2, ignore any model. Generate a photo of the customer wearing/using the product. Keep the customer's identity unchanged.

**Mode 2 — Room / Interior** (living_room, bedroom, kitchen, bathroom, office):
> Image 1 is a photo of a room/space. Image 2 is a furniture/decor product listing. Extract the product from Image 2. Generate a new photo of the SAME room from Image 1 with the product naturally placed inside it. Keep the room's layout, walls, floor, and existing items the same. Only add the new product in a realistic position with correct scale, lighting, and perspective. Do NOT add any people.

**Mode 3 — Pet** (pet):
> Image 1 is a photo of a pet. Image 2 is a pet product. Place the product on/near the pet naturally.

**Mode 4 — Car** (car_interior):
> Image 1 is a car interior photo. Image 2 is a car accessory. Place the product inside the car realistically.

**Mode 5 — Garden** (garden):
> Image 1 is a garden/outdoor space. Image 2 is a garden product. Place the product in the outdoor space.

### Implementation

Create a mapping from category to prompt mode, then build the prompt string accordingly. Each mode gets a tailored instruction that tells the AI exactly what Image 1 represents (person vs room vs pet vs car) and what to do with the product.

The product title will still be appended when available for extra context.

Retry logic (3 attempts with `google/gemini-3-pro-image-preview`) stays the same.

### File to change
- `supabase/functions/tryon-request/index.ts` — replace the single `promptText` with a function that generates the correct prompt based on `category`

