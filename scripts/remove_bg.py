from PIL import Image

def remove_white_bg(input_path, output_path, tolerance=50):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    # Any pixel close to white will become transparent
    for item in data:
        # item is (R, G, B, A)
        if item[0] > 255 - tolerance and item[1] > 255 - tolerance and item[2] > 255 - tolerance:
            # White-ish pixel -> transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")

remove_white_bg(r"d:\Projects\Lab-Test-Generator\src\assets\images\Logo.png", r"d:\Projects\Lab-Test-Generator\src\assets\images\Logo.png")
print("White background removed successfully.")
