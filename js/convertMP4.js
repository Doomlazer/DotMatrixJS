/**
 * ============================================================
 * MP4 -> DMD ANIMATION CONVERTER
 * ============================================================
 *
 * Features:
 *   - Browser-supported video formats
 *   - Maximum output width
 *   - Aspect ratio preserved
 *   - Configurable FPS
 *   - Full display.defaultPalette mode
 *   - Fast 32x32x32 RGB lookup
 *   - Exact RGBA cache
 *   - 4-tone amber DMD mode
 *   - Floyd-Steinberg dithering
 *   - Ordered dithering
 *   - No dithering
 *   - Row-major run-length encoding
 *
 *
 * IMPORTANT:
 *   There is only ONE amber quantizer.
 *   videoToAnimation() creates it and passes it directly
 *   to encodeAmberFrame().
 * ============================================================
 */


/* ============================================================
 * DEFAULTS
 * ============================================================
 */

const DEFAULT_AMBER_COLORS = [
    "#000000",
    '#7A4A00',
    '#B56A00',
    '#F0A500',
    '#FFC107'
];

const DEFAULT_AMBER_THRESHOLDS = [
    32,
    96,
    176,
    224
];


/* ============================================================
 * COLOR HELPERS
 * ============================================================
 */

function normalizeHex(hex) {

    hex = String(hex)
        .trim()
        .replace(/^#/, "");

    if (hex.length === 3) {
        hex =
            hex[0] + hex[0] +
            hex[1] + hex[1] +
            hex[2] + hex[2];
    }

    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        throw new Error(
            `Invalid color: #${hex}`
        );
    }

    return "#" + hex.toUpperCase();
}


function hexToRgb(hex) {

    hex = normalizeHex(hex);

    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}


function clampByte(value) {

    return Math.max(
        0,
        Math.min(
            255,
            value
        )
    );
}


/* ============================================================
 * LUMINANCE
 * ============================================================
 *
 * Integer approximation:
 *
 *   0.2126R + 0.7152G + 0.0722B
 * ============================================================
 */

function getLuminance(r, g, b) {

    return (
        54 * r +
        183 * g +
        19 * b
    ) >> 8;
}


/* ============================================================
 * PALETTE LOOKUP
 *
 * Supports palettes larger than 255 colors.
 *
 * 64 * 64 * 64 = 262,144 entries
 * Uint16Array supports palette indexes up to 65,535.
 * ============================================================
 */

function createPaletteLookup(palette) {

    const normalizedPalette =
        palette.map(normalizeHex);

    const paletteRGB =
        normalizedPalette.map(hexToRgb);

    if (paletteRGB.length === 0) {
        throw new Error(
            "Palette cannot be empty"
        );
    }

    if (paletteRGB.length > 65535) {
        throw new Error(
            "Palette cannot contain more than 65535 colors."
        );
    }

    /*
     * 64 levels per RGB channel.
     *
     * Much more accurate than 32x32x32 for large palettes.
     */
    const LOOKUP_BITS = 6;
    const LOOKUP_SIZE = 1 << LOOKUP_BITS; // 64
    const LOOKUP_MASK = LOOKUP_SIZE - 1;

    const lookup =
        new Uint16Array(
            LOOKUP_SIZE *
            LOOKUP_SIZE *
            LOOKUP_SIZE
        );

    /*
     * Exact RGB -> palette index.
     *
     * This guarantees that if the source pixel is EXACTLY
     * one of the palette colors, it gets that exact palette
     * entry instead of relying on the coarse lookup.
     */
    const exactMap = new Map();

    for (
        let i = 0;
        i < paletteRGB.length;
        i++
    ) {

        const p =
            paletteRGB[i];

        const key =
            (p.r << 16) |
            (p.g << 8) |
            p.b;

        /*
         * Keep the first occurrence if the palette contains
         * duplicate colors.
         */
        if (!exactMap.has(key)) {
            exactMap.set(key, i);
        }
    }

    /*
     * Build the 64^3 nearest-color lookup.
     *
     * Each cell represents the center of its RGB range.
     */
    for (
        let r = 0;
        r < LOOKUP_SIZE;
        r++
    ) {

        for (
            let g = 0;
            g < LOOKUP_SIZE;
            g++
        ) {

            for (
                let b = 0;
                b < LOOKUP_SIZE;
                b++
            ) {

                /*
                 * Center of this lookup cell.
                 *
                 * 0..63 -> approximately 0..255
                 */
                const rr =
                    Math.round(
                        ((r + 0.5) / LOOKUP_SIZE) * 255
                    );

                const gg =
                    Math.round(
                        ((g + 0.5) / LOOKUP_SIZE) * 255
                    );

                const bb =
                    Math.round(
                        ((b + 0.5) / LOOKUP_SIZE) * 255
                    );

                let bestIndex = 0;
                let bestDistance = Infinity;

                for (
                    let i = 0;
                    i < paletteRGB.length;
                    i++
                ) {

                    const p =
                        paletteRGB[i];

                    const sourceMax = Math.max(rr, gg, bb);
const sourceMin = Math.min(rr, gg, bb);
const sourceChroma = sourceMax - sourceMin;

const paletteMax = Math.max(p.r, p.g, p.b);
const paletteMin = Math.min(p.r, p.g, p.b);
const paletteChroma = paletteMax - paletteMin;

const dr = rr - p.r;
const dg = gg - p.g;
const db = bb - p.b;

const rgbDistance =
    dr * dr +
    dg * dg +
    db * db;

const chromaError =
    sourceChroma - paletteChroma;

let distance =
    rgbDistance +
    chromaError * chromaError * 2.5;

// If the source is noticeably colored,
// heavily discourage a neutral palette entry.
if (
    sourceChroma > 35 &&
    paletteChroma < 12
) {
    distance += 2500;
}

                    if (
                        distance <
                        bestDistance
                    ) {

                        bestDistance =
                            distance;

                        bestIndex =
                            i;

                        if (distance === 0) {
                            break;
                        }
                    }
                }

                const index =
                    (r << 12) |
                    (g << 6) |
                    b;

                lookup[index] =
                    bestIndex;
            }
        }
    }

    return {
        lookup,
        palette: normalizedPalette,
        paletteRGB,
        exactMap,

        lookupBits:
            LOOKUP_BITS,

        lookupSize:
            LOOKUP_SIZE,

        lookupMask:
            LOOKUP_MASK
    };
}


/* ============================================================
 * COLOR CACHE
 * ============================================================
 */

class ColorCache {

    constructor(maxSize = 16384) {

        this.map = new Map();
        this.maxSize = maxSize;
    }

    get(key) {
        return this.map.get(key);
    }

    set(key, value) {

        if (
            this.map.size >=
            this.maxSize
        ) {
            this.map.clear();
        }

        this.map.set(key, value);
    }

    clear() {
        this.map.clear();
    }
}


/* ============================================================
 * FAST PALETTE FRAME ENCODER
 * ============================================================
 */

function encodeFrameFast(
    data,
    palette,
    paletteLookup,
    colorCache
) {

    const output = [];

    let previousIndex = null;
    let count = 0;

    const lookup =
        paletteLookup.lookup;

    const exactMap =
        paletteLookup.exactMap;

    const lookupBits =
        paletteLookup.lookupBits;

    const paletteLength =
        palette.length;

    /*
     * Safety check.
     */
    if (
        paletteLength > 65535
    ) {
        throw new Error(
            "Palette cannot contain more than 65535 colors."
        );
    }

    for (
        let i = 0;
        i < data.length;
        i += 4
    ) {

        const r =
            data[i];

        const g =
            data[i + 1];

        const b =
            data[i + 2];

        const a =
            data[i + 3];

        let paletteIndex;

        /*
         * Transparent pixels always use palette index 0.
         */
        if (a < 128) {

            paletteIndex = 0;

        } else {

            /*
             * ------------------------------------------------
             * Exact color check
             * ------------------------------------------------
             *
             * This is important for large palettes.
             *
             * If the source pixel exactly equals a palette
             * color, use that exact palette entry.
             */
            const exactKey =
                (r << 16) |
                (g << 8) |
                b;

            paletteIndex =
                exactMap.get(exactKey);

            if (
                paletteIndex === undefined
            ) {

                /*
                 * ------------------------------------------------
                 * Cache
                 * ------------------------------------------------
                 */

                const cacheKey =
                    (
                        (r << 24) |
                        (g << 16) |
                        (b << 8) |
                        a
                    ) >>> 0;

                paletteIndex =
                    colorCache.get(cacheKey);

                if (
                    paletteIndex === undefined
                ) {

                    /*
                     * ------------------------------------------------
                     * 64x64x64 lookup
                     * ------------------------------------------------
                     *
                     * 8-bit RGB:
                     *
                     * r >> 2
                     * g >> 2
                     * b >> 2
                     *
                     * gives 0..63.
                     */
                    const rr =
                        r >> (8 - lookupBits);

                    const gg =
                        g >> (8 - lookupBits);

                    const bb =
                        b >> (8 - lookupBits);

                    const lookupIndex =
                        (rr << 12) |
                        (gg << 6) |
                        bb;

                    paletteIndex =
                        lookup[
                            lookupIndex
                        ];

                    /*
                     * Extra safety in case a bad lookup somehow
                     * returns outside the palette.
                     */
                    if (
                        paletteIndex >=
                        paletteLength
                    ) {

                        throw new Error(
                            `Palette lookup returned invalid index ${paletteIndex} ` +
                            `for palette of ${paletteLength} colors.`
                        );
                    }

                    colorCache.set(
                        cacheKey,
                        paletteIndex
                    );
                }
            }
        }

        /*
         * ----------------------------------------------------
         * RLE
         * ----------------------------------------------------
         */

        if (
            paletteIndex ===
            previousIndex
        ) {

            count++;

        } else {

            if (
                previousIndex !== null
            ) {

                output.push(
                    previousIndex,
                    count
                );
            }

            previousIndex =
                paletteIndex;

            count = 1;
        }
    }

    /*
     * Finish final run.
     */
    if (
        previousIndex !== null
    ) {

        output.push(
            previousIndex,
            count
        );
    }

    return output;
}


/* ============================================================
 * AMBER LOOKUP
 * ============================================================
 */

function createAmberLevelLookup(
    thresholds = DEFAULT_AMBER_THRESHOLDS
) {

    if (
        !Array.isArray(thresholds) ||
        thresholds.length !== 4
    ) {

        throw new Error(
            "amberThresholds must contain exactly 4 values"
        );
    }

    const t0 =
        Math.round(
            clampByte(
                Number(thresholds[0])
            )
        );

    const t1 =
        Math.round(
            clampByte(
                Number(thresholds[1])
            )
        );

    const t2 =
        Math.round(
            clampByte(
                Number(thresholds[2])
            )
        );

    const t3 =
        Math.round(
            clampByte(
                Number(thresholds[3])
            )
        );

    if (
        !(
            t0 < t1 &&
            t1 < t2 &&
            t2 < t3
        )
    ) {

        throw new Error(
            "amberThresholds must be ascending, e.g. [24, 64, 120, 192]"
        );
    }

    const lookup =
        new Uint8Array(256);

    for (
        let brightness = 0;
        brightness < 256;
        brightness++
    ) {

        if (brightness < t0) {

            lookup[brightness] = 0;

        } else if (brightness < t1) {

            lookup[brightness] = 1;

        } else if (brightness < t2) {

            lookup[brightness] = 2;

        } else if (brightness < t3) {

            lookup[brightness] = 3;

        } else {

            lookup[brightness] = 4;
        }
    }

    return {
        lookup,
        thresholds: [
            t0,
            t1,
            t2,
            t3
        ]
    };
}


/* ============================================================
 * CREATE AMBER QUANTIZER
 * ============================================================
 */

function createAmberQuantizer(
    options = {}
) {

    const colors =
        options.colors ||
        DEFAULT_AMBER_COLORS;

    const amberThresholds =
        options.amberThresholds ||
        DEFAULT_AMBER_THRESHOLDS;

    const dithering =
        options.dithering ||
        "floyd-steinberg";

    console.log(colors.length)
    if (
        !Array.isArray(colors) ||
        colors.length !== 5
    ) {
        throw new Error(
            "Amber mode requires exactly 5 colors"
        );
    }

    if (
        ![
            "none",
            "ordered",
            "floyd-steinberg"
        ].includes(dithering)
    ) {

        throw new Error(
            `Invalid amber dithering mode: ${dithering}`
        );
    }

    const normalizedColors =
        colors.map(normalizeHex);

    const levels =
        normalizedColors.map(hexToRgb);

    const levelData =
        createAmberLevelLookup(
            amberThresholds
        );

    return {
        colors: normalizedColors,
        levels,
        thresholds: levelData.thresholds,
        lookup: levelData.lookup,
        dithering
    };
}


/* ============================================================
 * AMBER REPRESENTATIVE BRIGHTNESS
 * ============================================================
 */

function getAmberLevelBrightness(
    level,
    amber
) {

    const rgb =
        amber.levels[level];

    return getLuminance(
        rgb.r,
        rgb.g,
        rgb.b
    );
}


/* ============================================================
 * AMBER RLE HELPER
 * ============================================================
 *
 * Keeps all three amber encoders consistent.
 * ============================================================
 */

function appendAmberPixel(
    output,
    state,
    color,
    palette
) {

    const paletteIndex =
        palette.indexOf(
            normalizeHex(color)
        );

    if (paletteIndex === -1) {
        throw new Error(
            `Color ${color} was not found in display.defaultPalette`
        );
    }

    if (
        paletteIndex === state.previousIndex
    ) {

        state.count++;

    } else {

        if (
            state.previousIndex !== null
        ) {

            output.push(
                state.previousIndex,
                state.count
            );
        }

        state.previousIndex =
            paletteIndex;

        state.count = 1;
    }
}


function finishAmberRLE(
    output,
    state
) {

    if (
        state.previousIndex !== null
    ) {

        output.push(
            state.previousIndex,
            state.count
        );
    }
}


/* ============================================================
 * AMBER - NO DITHER
 * ============================================================
 */

function encodeAmberFrameThresholded(
    data,
    amber,
    palette
) {

    if (
        !amber ||
        !amber.colors ||
        !amber.lookup
    ) {

        throw new Error(
            "Invalid amber quantizer"
        );
    }

    const output = [];

    const state = {
        previousIndex: null,
        count: 0
    };

    const colors =
        amber.colors;

    const lookup =
        amber.lookup;

    for (
        let i = 0;
        i < data.length;
        i += 4
    ) {

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        let level = 0;

        if (a >= 128) {

            const brightness =
                getLuminance(
                    r,
                    g,
                    b
                );

            level =
                lookup[brightness];
        }

        appendAmberPixel(
            output,
            state,
            colors[level],
            palette
        );
    }

    finishAmberRLE(
        output,
        state
    );

    return output;
}


/* ============================================================
 * BAYER 4x4
 * ============================================================
 */

const BAYER_4X4 = new Uint8Array([
     0,  8,  2, 10,
    12,  4, 14,  6,
     3, 11,  1,  9,
    15,  7, 13,  5
]);


/* ============================================================
 * AMBER - ORDERED DITHER
 * ============================================================
 *
 * Deliberately uses a small modulation.
 *
 * IMPORTANT:
 * The modulation is applied BEFORE lookup and never produces
 * an invalid lookup index because brightness is clamped.
 * ============================================================
 */

function encodeAmberFrameOrdered(
    data,
    width,
    height,
    amber,
    palette
) {

    if (
        !amber ||
        !amber.colors ||
        !amber.lookup ||
        !amber.levels
    ) {

        throw new Error(
            "Invalid amber quantizer"
        );
    }

    if (
        data.length !==
        width * height * 4
    ) {

        throw new Error(
            "Amber ordered dithering received invalid frame dimensions"
        );
    }

    const output = [];

    const state = {
        previousIndex: null,
        count: 0
    };

    const colors =
        amber.colors;

    const lookup =
        amber.lookup;

    for (
        let y = 0;
        y < height;
        y++
    ) {

        for (
            let x = 0;
            x < width;
            x++
        ) {

            const pixelIndex =
                y * width + x;

            const dataIndex =
                pixelIndex * 4;

            const r =
                data[dataIndex];

            const g =
                data[dataIndex + 1];

            const b =
                data[dataIndex + 2];

            const a =
                data[dataIndex + 3];

            let level = 0;

            if (a >= 128) {

                let brightness =
                    getLuminance(
                        r,
                        g,
                        b
                    );

                const matrixValue =
                    BAYER_4X4[
                        ((y & 3) << 2) |
                        (x & 3)
                    ];

                /*
                 * Range:
                 *
                 *   -7.5 .. +7.5
                 *
                 * This is intentionally subtle.
                 */
                brightness +=
                    (matrixValue - 7.5) * 2;

                brightness =
                    Math.round(
                        clampByte(
                            brightness
                        )
                    );

                level =
                    lookup[brightness];
            }

            appendAmberPixel(
                output,
                state,
                colors[level],
                palette
            );
        }
    }

    finishAmberRLE(
        output,
        state
    );

    return output;
}


/* ============================================================
 * AMBER - FLOYD STEINBERG
 * ============================================================
 */

function encodeAmberFrameDithered(
    data,
    width,
    height,
    amber,
    palette
) {

    if (
        !amber ||
        !amber.colors ||
        !amber.lookup ||
        !amber.levels
    ) {

        throw new Error(
            "Invalid amber quantizer"
        );
    }

    if (
        data.length !==
        width * height * 4
    ) {

        throw new Error(
            "Amber dithering received invalid frame dimensions"
        );
    }

    const output = [];

    const errors =
        new Float32Array(
            width * height
        );

    const state = {
        previousIndex: null,
        count: 0
    };

    const colors =
        amber.colors;

    const lookup =
        amber.lookup;

    for (
        let y = 0;
        y < height;
        y++
    ) {

        for (
            let x = 0;
            x < width;
            x++
        ) {

            const pixelIndex =
                y * width + x;

            const dataIndex =
                pixelIndex * 4;

            const r =
                data[dataIndex];

            const g =
                data[dataIndex + 1];

            const b =
                data[dataIndex + 2];

            const a =
                data[dataIndex + 3];

            let level = 0;

            if (a >= 128) {

                let brightness =
                    getLuminance(
                        r,
                        g,
                        b
                    );

                brightness +=
                    errors[pixelIndex];

                brightness =
                    Math.round(
                        clampByte(
                            brightness
                        )
                    );

                level =
                    lookup[brightness];

                const quantizedBrightness =
                    getAmberLevelBrightness(
                        level,
                        amber
                    );

                const error =
                    brightness -
                    quantizedBrightness;

                /*
                 * Floyd-Steinberg:
                 *
                 *             current    7/16
                 *
                 *      3/16     5/16      1/16
                 */

                if (
                    x + 1 < width
                ) {

                    errors[
                        pixelIndex + 1
                    ] +=
                        error * 7 / 16;
                }

                if (
                    x > 0 &&
                    y + 1 < height
                ) {

                    errors[
                        pixelIndex + width - 1
                    ] +=
                        error * 3 / 16;
                }

                if (
                    y + 1 < height
                ) {

                    errors[
                        pixelIndex + width
                    ] +=
                        error * 5 / 16;
                }

                if (
                    x + 1 < width &&
                    y + 1 < height
                ) {

                    errors[
                        pixelIndex + width + 1
                    ] +=
                        error / 16;
                }
            }

            appendAmberPixel(
                output,
                state,
                colors[level],
                palette
            );
        }
    }

    finishAmberRLE(
        output,
        state
    );

    return output;
}


/* ============================================================
 * AMBER DISPATCHER
 * ============================================================
 */

function encodeAmberFrame(
    data,
    width,
    height,
    amber,
    palette
) {

    if (!amber) {

        throw new Error(
            "Amber quantizer is undefined"
        );
    }

    if (
        !Array.isArray(amber.colors) ||
        amber.colors.length !== 5
    ) {

        throw new Error(
            "Invalid amber colors"
        );
    }

    if (
        !(amber.lookup instanceof Uint8Array) ||
        amber.lookup.length !== 256
    ) {

        throw new Error(
            "Invalid amber lookup table"
        );
    }

    switch (
        amber.dithering
    ) {

        case "none":

            return encodeAmberFrameThresholded(
                data,
                amber,
                palette
            );

        case "ordered":

            return encodeAmberFrameOrdered(
                data,
                width,
                height,
                amber,
                palette
            );

        case "floyd-steinberg":

            return encodeAmberFrameDithered(
                data,
                width,
                height,
                amber,
                palette
            );

        default:

            throw new Error(
                `Unknown amber dithering mode: ${amber.dithering}`
            );
    }
}


/* ============================================================
 * VIDEO EVENT HELPER
 * ============================================================
 */

function waitForEvent(
    video,
    eventName
) {

    return new Promise(
        (resolve, reject) => {

            let finished = false;

            const cleanup = () => {

                video.removeEventListener(
                    eventName,
                    onEvent
                );

                video.removeEventListener(
                    "error",
                    onError
                );
            };

            const onEvent = () => {

                if (finished) {
                    return;
                }

                finished = true;

                cleanup();
                resolve();
            };

            const onError = () => {

                if (finished) {
                    return;
                }

                finished = true;

                cleanup();

                const mediaError =
                    video.error;

                reject(
                    new Error(
                        mediaError
                            ? `Video error ${mediaError.code}: ${mediaError.message || "unknown error"}`
                            : `Video ${eventName} failed`
                    )
                );
            };

            video.addEventListener(
                eventName,
                onEvent,
                { once: true }
            );

            video.addEventListener(
                "error",
                onError,
                { once: true }
            );
        }
    );
}


/* ============================================================
 * VIDEO SEEK
 * ============================================================
 */

function seekVideo(
    video,
    time
) {

    return new Promise(
        (resolve, reject) => {

            let finished = false;

            const cleanup = () => {

                video.removeEventListener(
                    "seeked",
                    onSeeked
                );

                video.removeEventListener(
                    "error",
                    onError
                );
            };

            const finish = (
                callback,
                value
            ) => {

                if (finished) {
                    return;
                }

                finished = true;

                cleanup();

                callback(value);
            };

            const onSeeked = () => {

                finish(resolve);
            };

            const onError = () => {

                const mediaError =
                    video.error;

                finish(
                    reject,
                    new Error(
                        mediaError
                            ? `Video seek error ${mediaError.code}: ${mediaError.message || "unknown error"}`
                            : "Video seek failed"
                    )
                );
            };

            video.addEventListener(
                "seeked",
                onSeeked,
                { once: true }
            );

            video.addEventListener(
                "error",
                onError,
                { once: true }
            );

            /*
             * Don't wait for a seeked event when we're already
             * essentially at the requested timestamp.
             */
            if (
                Math.abs(
                    video.currentTime - time
                ) < 0.0005
            ) {

                finish(resolve);
                return;
            }

            try {

                video.currentTime = time;

            } catch (error) {

                finish(
                    reject,
                    error
                );
            }
        }
    );
}


/* ============================================================
 * MAIN VIDEO -> ANIMATION
 * ============================================================
 */

async function videoToAnimation(
    file,
    display,
    options = {}
) {

    const {

        bgColor = options.bgColor || "#000000",
        
        maxWidth = options.maxWidth || 64,

        fps = options.fps || 10,

        maxFrames = options.maxFrames || 5000,

        colorMode = options.colorMode || "palette",

        amberColors = options.amberColors || DEFAULT_AMBER_COLORS,

        amberThresholds = options.amberThresholds || DEFAULT_AMBER_THRESHOLDS,

        dithering = options.dithering || "floyd-steinberg",

        color = options.color || "#000000",

        speed = options.speed || 5,

        offset = options.offset || 0,

        aniDelay = options.aniDelay || 2,

        repeats = options.repeats ?? true,

        dir = options.dir || 0,

        x = options.x || 0,

        y = options.y || 0,

        upscale = options.upscale || false,

        onProgress = options.onProgress || null

    } = options;


    /* --------------------------------------------------------
     * VALIDATION
     * --------------------------------------------------------
     */

    if (!file) {
        throw new Error(
            "No video file supplied"
        );
    }

    if (
        !(file instanceof Blob)
    ) {
        throw new Error(
            "file must be a File or Blob"
        );
    }

    if (!display) {
        throw new Error(
            "display is required"
        );
    }

    if (
        !Array.isArray(
            display.defaultPalette
        ) ||
        display.defaultPalette.length === 0
    ) {
        throw new Error(
            "display.defaultPalette is empty or missing"
        );
    }

    if (
        !Number.isFinite(maxWidth) ||
        maxWidth < 1
    ) {
        throw new Error(
            "maxWidth must be greater than zero"
        );
    }

    if (
        !Number.isFinite(fps) ||
        fps <= 0
    ) {
        throw new Error(
            "fps must be greater than zero"
        );
    }

    if (
        !Number.isFinite(maxFrames) ||
        maxFrames < 1
    ) {
        throw new Error(
            "maxFrames must be greater than zero"
        );
    }


    /* --------------------------------------------------------
     * PREPARE PALETTE
     * --------------------------------------------------------
     */

let palette;

let paletteData = null;
let amberQuantizer = null;

if (colorMode === "palette") {

    palette =
        display.defaultPalette.map(
            normalizeHex
        );

    paletteData =
        createPaletteLookup(
            palette
        );

} else if (colorMode === "amber5") {

    display.selectedColor = 4;
    palette =
        amberColors.map(
            normalizeHex
        );
        //console.log("palette ",palette)

    amberQuantizer =
        createAmberQuantizer({
            colors:
                palette,

            amberThresholds:
                amberThresholds,

            dithering:
                dithering
        });

} else {

    throw new Error(
        `Unknown colorMode: ${colorMode}`
    );
}


    /* --------------------------------------------------------
     * COLOR CACHE
     * --------------------------------------------------------
     */

    const colorCache =
        new ColorCache(16384);


    /* --------------------------------------------------------
     * VIDEO
     * --------------------------------------------------------
     */

    const video =
        document.createElement(
            "video"
        );

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    /*
     * blob: URL works for MP4, WebM, MOV and other formats
     * supported by the browser.
     */
    const objectUrl =
        URL.createObjectURL(file);

    video.src =
        objectUrl;


    try {

        /* ----------------------------------------------------
         * LOAD METADATA
         * ----------------------------------------------------
         */

        await waitForEvent(
            video,
            "loadedmetadata"
        );


        if (
            !video.videoWidth ||
            !video.videoHeight
        ) {

            throw new Error(
                "Unable to determine video dimensions"
            );
        }


        /* ----------------------------------------------------
         * DIMENSIONS
         * ----------------------------------------------------
         */

        const sourceWidth =
            video.videoWidth;

        const sourceHeight =
            video.videoHeight;

        let width;

        if (upscale) {

            width =
                Math.round(
                    maxWidth
                );

        } else {

            width =
                Math.min(
                    sourceWidth,
                    Math.round(maxWidth)
                );
        }

        const height =
            Math.max(
                1,
                Math.round(
                    sourceHeight *
                    (
                        width /
                        sourceWidth
                    )
                )
            );


        /* ----------------------------------------------------
         * CANVAS
         * ----------------------------------------------------
         */

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            width;

        canvas.height =
            height;

        const ctx =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently: true
                }
            );

        if (!ctx) {

            throw new Error(
                "Unable to create canvas context"
            );
        }

        ctx.imageSmoothingEnabled =
            false;


        /* ----------------------------------------------------
         * DURATION
         * ----------------------------------------------------
         */

        const duration =
            video.duration;

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            throw new Error(
                "Invalid video duration"
            );
        }


        /* ----------------------------------------------------
         * FRAME COUNT
         * ----------------------------------------------------
         */

        const requestedFrames =
            Math.max(
                1,
                Math.ceil(
                    duration * fps
                )
            );

        const frameCount =
            Math.min(
                requestedFrames,
                Math.floor(maxFrames)
            );


        const frames = [];


        /* ----------------------------------------------------
         * EXTRACT
         * ----------------------------------------------------
         */

        for (
            let frameIndex = 0;
            frameIndex < frameCount;
            frameIndex++
        ) {

            let time =
                frameIndex / fps;

            time =
                Math.min(
                    time,
                    Math.max(
                        0,
                        duration - 0.001
                    )
                );


            await seekVideo(
                video,
                time
            );


            /* ------------------------------------------------
             * DRAW
             * ------------------------------------------------
             */

            ctx.clearRect(
                0,
                0,
                width,
                height
            );

            ctx.drawImage(
                video,
                0,
                0,
                width,
                height
            );


            /* ------------------------------------------------
             * READ
             * ------------------------------------------------
             */

            const image =
                ctx.getImageData(
                    0,
                    0,
                    width,
                    height
                );


            let encodedFrame;


            /* ------------------------------------------------
             * ENCODE
             * ------------------------------------------------
             */

            if (
                colorMode === "amber5"
            ) {

                /*
                 * CORRECT ARGUMENT ORDER:
                 *
                 *   data
                 *   width
                 *   height
                 *   amberQuantizer
                 */
                encodedFrame =
                    encodeAmberFrame(
                        image.data,
                        width,
                        height,
                        amberQuantizer,
                        palette
                    );

            } else {

                encodedFrame =
                    encodeFrameFast(
                        image.data,
                        paletteData.palette,
                        paletteData,
                        colorCache
                    );
            }


            frames.push(
                encodedFrame
            );


            /* ------------------------------------------------
             * PROGRESS
             * ------------------------------------------------
             */

            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress({
                    frame:
                        frameIndex + 1,

                    totalFrames:
                        frameCount,

                    progress:
                        (
                            frameIndex + 1
                        ) /
                        frameCount
                });
            }
        }


        /* ----------------------------------------------------
         * RESULT
         * ----------------------------------------------------
         */

        return {

            str: "",

            x,
            y,

            width,
            height,

            type:
                "animation",

            color:
                normalizeHex(color),

            colorMode,

            speed,

            offset,

            aniDelay,

            bgColor,

            repeats,

            dir,

            currentFrame:
                0,

            frames,

            palette,

            paletteWidth:
                16,

            paletteSize:
                16
        };


    } finally {

        /* ----------------------------------------------------
         * CLEANUP
         * ----------------------------------------------------
         */

        try {
            video.pause();
        } catch (_) {
            // Ignore cleanup errors.
        }

        video.removeAttribute(
            "src"
        );

        video.load();

        URL.revokeObjectURL(
            objectUrl
        );
    }
}


/* ============================================================
 * MP4 INPUT HANDLER
 * ============================================================
 *
 * Expected HTML:
 *
 * <input
 *     id="convertMP4"
 *     type="file"
 *     accept="video/*"
 * >
 *
 * ============================================================
 */

const videoInput =
    document.getElementById(
        "convertMP4"
    );


if (!videoInput) {

    console.warn(
        'MP4 input "#convertMP4" was not found.'
    );

} else {

    videoInput.addEventListener(
        "change",
        async (event) => {

            const file =
                event.target.files?.[0];

            if (!file) {
                return;
            }

            try {

                console.log(
                    "Converting video:",
                    file.name
                );


                const animation =
                    await videoToAnimation(
                        file,
                        display,
                        {

                            maxWidth:
                                64,

                            fps:
                                10,

                            maxFrames:
                                500,

                            colorMode:
                                "palette",
                                //"amber5",

                            amberColors: [
                                "#000000",
                                "#7A4A00",
                                "#B56A00",
                                "#F0A500",
                                "#FFC107"
                            ],

                            amberThresholds: [
                                32,
                                96,
                                176,
                                224
                            ],

                            /*
                             * Choose ONE:
                             *
                             * "none"
                             * "ordered"
                             * "floyd-steinberg"
                             */
                            dithering:
                                "ordered",

                            color:
                                "#FFB000",

                            speed:
                                5,

                            offset:
                                0,

                            aniDelay:
                                2,

                            repeats:
                                true,

                            dir:
                                0,

                            x:
                                0,

                            y:
                                0,

                            upscale:
                                false,

                            onProgress:
                                ({
                                    frame,
                                    totalFrames,
                                    progress
                                }) => {

                                    /*console.log(
                                        `Converting frame ${frame}/${totalFrames} ` +
                                        `(${Math.round(progress * 100)}%)`
                                    );*/
                                }
                        }
                    );


                console.log(
                    "Animation conversion complete:",
                    animation
                );


                /* ------------------------------------------------
                 * STORE ANIMATION
                 * ------------------------------------------------
                 */

                display.animationQueue[
                    display.selectedAnimation
                ] =
                    animation;


                display.width =
                    animation.width;

                display.height =
                    animation.height;


                /* ------------------------------------------------
                 * REDRAW
                 * ------------------------------------------------
                 */

                display.clearPixelData(
                    display.animationQueue[
                        display.selectedAnimation
                    ]
                );


                /*
                 * Optional JSON:
                 *
                 * const json =
                 *     JSON.stringify(
                 *         animation,
                 *         null,
                 *         2
                 *     );
                 *
                 * console.log(json);
                 */

            } catch (error) {

                console.error(
                    "Error converting video:",
                    error
                );

                alert(
                    "Error converting video: " +
                    (
                        error?.message ||
                        String(error)
                    )
                );
            }
        }
    );
}

async function captureFrame(w, h) {
    const saveAs = "frame-";

    const width = w * display.pixelSize;
    const height = h * display.pixelSize;

    const ani =
        display.animationQueue[display.selectedAnimation];

    if (!ani || ani.type !== "animation") {
        throw new Error("Selected animation is not an animation.");
    }

    // ------------------------------------------------------------
    // Save current state
    // ------------------------------------------------------------

    const saved = {
        canvasWidth: bctx.canvas.width,
        canvasHeight: bctx.canvas.height,

        pixelData: display.pixelData,
        prevPixelData: display.prevPixelData,

        currentFrame: ani.currentFrame,
        aniDelay: ani.aniDelay,

        editMode: display.editMode,
        bgColor: display.bgColor
    };

    try {

        // --------------------------------------------------------
        // Resize bctx to the FULL animation dimensions.
        //
        // This is the important part. The browser viewport does
        // NOT limit the canvas backing buffer.
        // --------------------------------------------------------

        bctx.canvas.width = width;
        bctx.canvas.height = height;

        // --------------------------------------------------------
        // Select the current animation frame.
        // --------------------------------------------------------

        const framePixels =
            display.expandFrame(
                ani.frames[ani.currentFrame],
                ani
            );

        display.pixelData = framePixels;

        // Force drawMatrix() to draw EVERY pixel.
        display.prevPixelData =
            new Array(framePixels.length).fill(null);

        // Don't allow drawMatrix() to advance animation.
        display.editMode = true;

        // --------------------------------------------------------
        // Draw the complete frame.
        // --------------------------------------------------------

        display.drawMatrix();

        // --------------------------------------------------------
        // Read the ENTIRE backing canvas.
        // --------------------------------------------------------

        const imageData =
            bctx.getImageData(
                0,
                0,
                width,
                height
            );

        const pixels = imageData.data;

        // --------------------------------------------------------
        // Create BMP
        // --------------------------------------------------------

        const rowSize =
            Math.ceil((width * 3) / 4) * 4;

        const pixelDataSize =
            rowSize * height;

        const fileSize =
            54 + pixelDataSize;

        const buffer =
            new ArrayBuffer(fileSize);

        const view =
            new DataView(buffer);

        // BMP file header
        view.setUint8(0, 0x42); // B
        view.setUint8(1, 0x4D); // M

        view.setUint32(
            2,
            fileSize,
            true
        );

        view.setUint16(6, 0, true);
        view.setUint16(8, 0, true);

        view.setUint32(
            10,
            54,
            true
        );

        // DIB header
        view.setUint32(
            14,
            40,
            true
        );

        view.setInt32(
            18,
            width,
            true
        );

        // Positive = bottom-up BMP
        view.setInt32(
            22,
            height,
            true
        );

        view.setUint16(
            26,
            1,
            true
        );

        view.setUint16(
            28,
            24,
            true
        );

        // No compression
        view.setUint32(
            30,
            0,
            true
        );

        view.setUint32(
            34,
            pixelDataSize,
            true
        );

        // Resolution
        view.setInt32(
            38,
            2835,
            true
        );

        view.setInt32(
            42,
            2835,
            true
        );

        view.setUint32(46, 0, true);
        view.setUint32(50, 0, true);

        // --------------------------------------------------------
        // RGBA -> BGR
        // --------------------------------------------------------

        let offset = 54;

        for (let y = height - 1; y >= 0; y--) {

            for (let x = 0; x < width; x++) {

                const src =
                    (y * width + x) * 4;

                view.setUint8(
                    offset++,
                    pixels[src + 2]
                ); // B

                view.setUint8(
                    offset++,
                    pixels[src + 1]
                ); // G

                view.setUint8(
                    offset++,
                    pixels[src]
                ); // R
            }

            // BMP row padding
            while (
                (offset - 54) % rowSize !== 0
            ) {
                view.setUint8(
                    offset++,
                    0
                );
            }
        }

        // --------------------------------------------------------
        // Download
        // --------------------------------------------------------

        const blob = new Blob(
            [buffer],
            {
                type: "image/bmp"
            }
        );

        const url =
            URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href = url;

        a.download =
            `${saveAs}${display.selectedAnimation}.bmp`;

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        return blob;

    } finally {

        // --------------------------------------------------------
        // Restore the live canvas/state.
        // --------------------------------------------------------

        display.pixelData = saved.pixelData;
        display.prevPixelData = saved.prevPixelData;

        ani.currentFrame = saved.currentFrame;
        ani.aniDelay = saved.aniDelay;

        display.editMode = saved.editMode;
        display.bgColor = saved.bgColor;

        // Restore canvas size.
        //
        // NOTE: changing canvas width/height clears it, so your
        // normal render loop should redraw it afterward.
        bctx.canvas.width = saved.canvasWidth;
        bctx.canvas.height = saved.canvasHeight;
    }
}



async function exportAnimation(w, h, fps = 10) {
    const ani = display.animationQueue[display.selectedAnimation];

    if (!ani || ani.type !== "animation") {
        throw new Error("Selected item is not an animation.");
    }

    const width = w * display.pixelSize;
    const height = h * display.pixelSize;

    // ------------------------------------------------------------
    // Save ALL state that we are going to touch
    // ------------------------------------------------------------

    const saved = {
        editMode: display.editMode,
        currentFrame: ani.currentFrame,
        pixelData: display.pixelData,
        prevPixelData: display.prevPixelData,
        bgColor: display.bgColor,
        aniDelay: ani.aniDelay
    };

    // ------------------------------------------------------------
    // Canvas setup
    // ------------------------------------------------------------

    bctx.canvas.width = width;
    bctx.canvas.height = height;

    // IMPORTANT:
    // 0 = don't capture automatically.
    // We explicitly call requestFrame() once per animation frame.
    const stream = bctx.canvas.captureStream(0);

    const track = stream.getVideoTracks()[0];

    const mimeTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm"
    ];

    const mimeType = mimeTypes.find(type =>
        MediaRecorder.isTypeSupported(type)
    );

    if (!mimeType) {
        track.stop();
        throw new Error("Browser does not support WebM recording.");
    }

    const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000
    });

    const chunks = [];

    recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
            chunks.push(event.data);
        }
    };

    const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;

        recorder.onerror = event => {
            reject(event.error || new Error("MediaRecorder error"));
        };
    });

    // ------------------------------------------------------------
    // Start recording
    // ------------------------------------------------------------

    recorder.start(1000);

    // Give MediaRecorder time to initialize.
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        // Don't let normal animation playback modify the frame.
        display.editMode = false;

        const frameCount = ani.frames.length;

        console.log(
            `Exporting ${frameCount} frames at ${fps} FPS`
        );

        // --------------------------------------------------------
        // Render EVERY animation frame independently
        // --------------------------------------------------------

        for (let i = 0; i < frameCount; i++) {

            // Select EXACT animation frame.
            ani.currentFrame = i;

            // Convert this animation frame into pixelData.
            const framePixels =
                display.expandFrame(
                    ani.frames[i],
                    ani
                );

            display.pixelData = framePixels;

            // ----------------------------------------------------
            // IMPORTANT
            //
            // drawMatrix() only draws pixels that differ from
            // prevPixelData.
            //
            // Force every pixel to redraw.
            // ----------------------------------------------------

            display.prevPixelData =
                new Array(framePixels.length).fill(null);

            // ----------------------------------------------------
            // Draw the frame to bctx
            // ----------------------------------------------------

            display.drawMatrix();

            // ----------------------------------------------------
            // Explicitly tell CanvasCaptureMediaStreamTrack:
            // "THIS is the video frame."
            // ----------------------------------------------------

            if (typeof track.requestFrame === "function") {
                track.requestFrame();
            }

            // ----------------------------------------------------
            // Keep the video timing at the requested FPS.
            // ----------------------------------------------------

            await new Promise(resolve =>
                setTimeout(resolve, 1000 / fps)
            );

            if (i % 25 === 0) {
                console.log(
                    `Exporting frame ${i + 1}/${frameCount}`
                );
            }
        }

    } finally {

        // --------------------------------------------------------
        // Restore EVERYTHING we changed.
        // --------------------------------------------------------

        display.editMode = saved.editMode;
        ani.currentFrame = saved.currentFrame;
        display.pixelData = saved.pixelData;
        display.prevPixelData = saved.prevPixelData;
        display.bgColor = saved.bgColor;
        ani.aniDelay = saved.aniDelay;
    }

    // ------------------------------------------------------------
    // Finish recording
    // ------------------------------------------------------------

    recorder.stop();

    await stopped;

    track.stop();

    if (chunks.length === 0) {
        throw new Error("MediaRecorder produced no video data.");
    }

    const blob = new Blob(chunks, {
        type: mimeType
    });

    console.log(
        `Export complete: ${ani.frames.length} frames`
    );

    console.log(
        `Video size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`
    );

    // ------------------------------------------------------------
    // Download
    // ------------------------------------------------------------

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download =
        `animation-${display.selectedAnimation}.webm`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 5000);

    return blob;
}
