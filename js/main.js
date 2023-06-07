import n from './jsnes/index'

const canvas_ctx = canvas.getContext('2d')

canvas_ctx.fillStyle = "gray";
canvas_ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

var SCREEN_WIDTH = 256;
var SCREEN_HEIGHT = 240;
var FRAMEBUFFER_SIZE = SCREEN_WIDTH * SCREEN_HEIGHT;
const host = '10.0.25.132'
const buffer = new ArrayBuffer(4 * SCREEN_WIDTH * SCREEN_HEIGHT);
const framebuffer_u8 = new Uint8ClampedArray(buffer);
const framebuffer_u32 = new Uint32Array(buffer);

var AUDIO_BUFFERING = 512;
var SAMPLE_COUNT = 4 * 1024;
var SAMPLE_MASK = SAMPLE_COUNT - 1;
var audio_samples_L = new Float32Array(SAMPLE_COUNT);
var audio_samples_R = new Float32Array(SAMPLE_COUNT);
var audio_write_cursor = 0,
  audio_read_cursor = 0;


const nes = new n.NES({
  onFrame: function (framebuffer_24) {
    for (var i = 0; i < FRAMEBUFFER_SIZE; i++) {
      framebuffer_u32[i] = 0xFF000000 | framebuffer_24[i];
    }
  },
  onAudioSample: function (l, r) {
    audio_samples_L[audio_write_cursor] = l;
    audio_samples_R[audio_write_cursor] = r;
    audio_write_cursor = (audio_write_cursor + 1) & SAMPLE_MASK;
  },
});

function audio_remain () {
  return (audio_write_cursor - audio_read_cursor) & SAMPLE_MASK;
}

/**
 * 游戏主函数
 */
export default class Main {
  constructor () {
    this.texture = null
    this.load()
  }
  // nes.opts.emulateSound = false

  onAnimationFrame () {
    // if (!this.image) return
    // this.image.data.set(framebuffer_u8);
    const imageData = canvas_ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT)
    imageData.data.set(framebuffer_u8)
    canvas_ctx.putImageData(imageData, 0, 0);
    // canvas_ctx.putImageData(imageData, 0, 0)
    // window.requestAnimationFrame(this.onAnimationFrame)
  }

  static audio_callback (event) {
    var dst = event.outputBuffer;
    var len = dst.length;
    // Attempt to avoid buffer underruns.
    if (audio_remain() < AUDIO_BUFFERING) {
      nes.frame();
    }

    var dst_l = dst.getChannelData(0);
    var dst_r = dst.getChannelData(1);
    for (var i = 0; i < len; i++) {
      var src_idx = (audio_read_cursor + i) & SAMPLE_MASK;
      dst_l[i] = audio_samples_L[src_idx];
      dst_r[i] = audio_samples_R[src_idx];
    }

    audio_read_cursor = (audio_read_cursor + len) & SAMPLE_MASK;
  }

  load () {
    const that = this
    // Allocate framebuffer array.
    wx.request({
      url: `http://${host}:3000/jsnes/example/InterglacticTransmissing.nes`,
      responseType: 'arraybuffer',
      complete (e) {
        if (e.data) {
          const uint8Array = new Uint8Array(e.data);
          let asciiString = '';
          for (let i = 0; i < uint8Array.length; i++) {
            const asciiChar = String.fromCharCode(uint8Array[i]);
            asciiString += asciiChar;
          }
          nes.loadROM(asciiString)

          canvas_ctx.fillStyle = "red";
          canvas_ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
          canvas_ctx.fillStyle = "green";
          canvas_ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

          canvas_ctx.fillStyle = "blue";
          canvas_ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
          const img = new Image()
          img.src = `http://${host}:3000/001.png`
          // that.image = canvas_ctx.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
          img.onload = (e) => {
            canvas_ctx.drawImage(img, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
            // const imageData = canvas_ctx.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)
            // that.image = imageData

            canvas_ctx.fillStyle = "pink";
            canvas_ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

            setInterval(() => {
              nes.frame()
              that.onAnimationFrame()
            }, 100)
          }

          // window.requestAnimationFrame(Main.onAnimatxionFrame)

          // const audio_ctx = new AudioContext()
          // const script_processor = audio_ctx.createScriptProcessor(AUDIO_BUFFERING, 0, 2)
          // script_processor.onaudioprocess = Main.audio_callback;
          // script_processor.connect(audio_ctx.destination);

        }
      },
      fail: e => {
        console.error(e)
      }
    })
  }
}
