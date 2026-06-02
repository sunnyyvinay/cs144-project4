#include <stdlib.h>
#include <emscripten.h>

static unsigned char* pixel_buffer = NULL;

EMSCRIPTEN_KEEPALIVE
unsigned char* create_buffer(int width, int height) {
    if (pixel_buffer) free(pixel_buffer);
    pixel_buffer = (unsigned char*)malloc(width * height * 4);
    return pixel_buffer;
}

EMSCRIPTEN_KEEPALIVE
void free_buffer() {
    if (pixel_buffer) {
        free(pixel_buffer);
        pixel_buffer = NULL;
    }
}

static void iter_to_color(int iter, int max_iter,
                          unsigned char* r, unsigned char* g, unsigned char* b) {
    if (iter == max_iter) {
        *r = *g = *b = 0;
        return;
    }
    double t = (double)iter / (double)max_iter;
    *r = (unsigned char)(9.0 * (1.0 - t) * t * t * t * 255.0);
    *g = (unsigned char)(15.0 * (1.0 - t) * (1.0 - t) * t * t * 255.0);
    *b = (unsigned char)(8.5 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t * 255.0);
}

// Compute z = z^2 + c iterations for a single point (cx, cy) on the complex plane.
// Returns the iteration count at which |z| exceeds 2, or max_iter if it never does.
EMSCRIPTEN_KEEPALIVE
int mandelbrot_iterate(double cx, double cy, int max_iter) {
    double zx = 0.0;
    double zy = 0.0;
    int iter = 0;
    while (zx * zx + zy * zy <= 4.0 && iter < max_iter) {
        double new_zx = zx * zx - zy * zy + cx;
        zy = 2.0 * zx * zy + cy;
        zx = new_zx;
        iter++;
    }
    return iter;
}

// Compute the Mandelbrot set for a rectangular viewport and write
// the result as RGBA pixel data into pixel_buffer.
EMSCRIPTEN_KEEPALIVE
void compute_mandelbrot(int width, int height,
                        double center_x, double center_y,
                        double zoom, int max_iter) {
    if (!pixel_buffer) return;
    double scale = 4.0 / (width * zoom);

    for (int py = 0; py < height; py++) {
        for (int px = 0; px < width; px++) {
            double cx = center_x + (px - width / 2.0) * scale;
            double cy = center_y + (py - height / 2.0) * scale;

            int iter = mandelbrot_iterate(cx, cy, max_iter);

            unsigned char r, g, b;
            iter_to_color(iter, max_iter, &r, &g, &b);

            int offset = (py * width + px) * 4;
            pixel_buffer[offset]     = r;
            pixel_buffer[offset + 1] = g;
            pixel_buffer[offset + 2] = b;
            pixel_buffer[offset + 3] = 255;
        }
    }
}
