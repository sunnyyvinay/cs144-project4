CC = emcc
CFLAGS = -O3
EXPORTS = -sEXPORTED_FUNCTIONS='["_create_buffer","_free_buffer","_compute_mandelbrot","_mandelbrot_iterate","_malloc","_free"]'
RUNTIME = -sEXPORTED_RUNTIME_METHODS='["ccall","cwrap"]'
MODULE = -sMODULARIZE=1 -sEXPORT_NAME='createMandelbrotModule'
MEMORY = -sALLOW_MEMORY_GROWTH=1

TARGET = ../public/mandelbrot.js

all: $(TARGET)

$(TARGET): mandelbrot.c
	$(CC) $(CFLAGS) $(EXPORTS) $(RUNTIME) $(MODULE) $(MEMORY) $< -o $@

clean:
	rm -f $(TARGET) ../public/mandelbrot.wasm

.PHONY: all clean
