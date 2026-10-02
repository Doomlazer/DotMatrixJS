Try in browser http://doomlazer.github.io/DotMatrixJS

Animations are stored with RLE compression to keep file sizes and memory consumption down. The current frame is uncompressed as needed. The user interface certainly leaves something to be desired, but the project is nearly feature complete. However, some things, such as scrolling and printing text to the screen, are not currently accessible through the UI. I hope to change that in the near future and add the ability to edit palettes from the UI.

I've tried to keep as much as possible contained within DMDclasses.js, so that I can easily migrate this into some other projects.

LLM Disclosure: An LLM was used to write the MP4 Importer/Exporter because I needed that capability for another project and didn't have the time to fully research and write the implementation myself. Everything else, flaws and all, was developed entirely by a person without LLM assistance - for no other reason than I think pinball DMD animations look pretty cool.
