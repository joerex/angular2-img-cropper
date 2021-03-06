import {Component, Input, Renderer, ViewChild, ElementRef, Output, EventEmitter, Type} from "@angular/core";
import {ImageCropper} from "./imageCropper";
import {CropperSettings} from "./cropperSettings";
import {Exif} from "./exif";

@Component({
    selector: "img-cropper", template: `
    <span class="ng2-imgcrop">
      <input *ngIf="!settings.noFileInput" type="file" (change)="fileChangeListener($event)" >
      <canvas #cropcanvas
              (mousedown)="onMouseDown($event)"
              (mousemove)="onMouseMove($event)"
              (touchmove)="onTouchMove($event)"
              (touchend)="onTouchEnd($event)"
              (touchstart)="onTouchStart($event)">
      </canvas>
    </span>
  `
})
export class ImageCropperComponent extends Type {

    @ViewChild("cropcanvas", undefined) private cropcanvas: ElementRef;

    @Input() private settings: CropperSettings;
    @Input() private image: any;
    @Input() private cropper: ImageCropper;

    @Output() private onCrop: EventEmitter<any> = new EventEmitter();

    public croppedWidth: number;
    public croppedHeight: number;

    public intervalRef: number;

    public renderer: Renderer;

    constructor(renderer: Renderer) {
        super();
        this.renderer = renderer;
    }

    public ngAfterViewInit() {
        let canvas: HTMLCanvasElement = this.cropcanvas.nativeElement;

        if (!this.settings) {
            this.settings = new CropperSettings();
        }

        this.renderer.setElementAttribute(canvas, "width", this.settings.canvasWidth.toString());
        this.renderer.setElementAttribute(canvas, "height", this.settings.canvasHeight.toString());

        if (!this.cropper) {
            this.cropper = new ImageCropper(this.settings);
        }

        this.cropper.prepare(canvas);
    }

    public onTouchMove(event: TouchEvent): void {
        this.cropper.onTouchMove(event);
    }

    public onTouchStart(event: TouchEvent): void {
        this.cropper.onTouchStart(event);
    }

    public onTouchEnd(event: TouchEvent): void {
        this.cropper.onTouchEnd(event);
        if (this.cropper.isImageSet()) {
            let bounds = this.cropper.getCropBounds();
            let width = bounds.right - bounds.left;
            let height = bounds.bottom - bounds.top;
            this.image.image = this.cropper.getCroppedImage(width, height).src;
            this.onCrop.emit(this.cropper.getCropBounds());
        }
    }

    public onMouseDown(): void {
        this.cropper.onMouseDown();

        document.addEventListener('mouseup', (event: any) => {
           this.onMouseUp();
        }, {once: true});
    }

    public onMouseUp(): void {
        if (this.cropper.isImageSet()) {
            this.cropper.onMouseUp();
            let bounds = this.cropper.getCropBounds();
            let width = bounds.right - bounds.left;
            let height = bounds.bottom - bounds.top;
            this.image.image = this.cropper.getCroppedImage(width, height).src;
            this.onCrop.emit(this.cropper.getCropBounds());
        }
    }

    public onMouseMove(event: MouseEvent): void {
        this.cropper.onMouseMove(event);
    }

    public fileChangeListener($event: any) {
        let file: File = $event.target.files[0];
        if (this.settings.allowedFilesRegex.test(file.name)) {
            let image: any = new Image();
            let fileReader: FileReader = new FileReader();
            let that = this;

            fileReader.addEventListener("loadend", function (loadEvent: any) {
                image.src = loadEvent.target.result;
                that.setImage(image);
            });

            fileReader.readAsDataURL(file);
        }
    }

    public setImage(image: HTMLImageElement) {
        let self = this;

        this.intervalRef = window.setInterval(function () {
            if (this.intervalRef) {
                clearInterval(this.intervalRef);
            }
            if (image.naturalHeight > 0) {

                image.height = image.naturalHeight;
                image.width = image.naturalWidth;

                clearInterval(self.intervalRef);
                self.getOrientedImage(image, function (img: HTMLImageElement) {
                    self.cropper.setImage(img);
                    self.image.original = img;
                    let bounds = self.cropper.getCropBounds();
                    let width = bounds.right - bounds.left;
                    let height = bounds.bottom - bounds.top;
                    self.image.image = self.cropper.getCroppedImage(width, height).src;
                    self.onCrop.emit(self.cropper.getCropBounds());
                });
            }
        }, 10);

    }

    private getOrientedImage(image: HTMLImageElement, callback: Function) {
        let img: any;

        Exif.getData(image, function () {
            let orientation = Exif.getTag(image, "Orientation");

            if ([3, 6, 8].indexOf(orientation) > -1) {
                let canvas: HTMLCanvasElement = document.createElement("canvas"),
                    ctx: CanvasRenderingContext2D = canvas.getContext("2d"),
                    cw: number = image.width,
                    ch: number = image.height,
                    cx: number = 0,
                    cy: number = 0,
                    deg: number = 0;

                switch (orientation) {
                    case 3:
                        cx = -image.width;
                        cy = -image.height;
                        deg = 180;
                        break;
                    case 6:
                        cw = image.height;
                        ch = image.width;
                        cy = -image.height;
                        deg = 90;
                        break;
                    case 8:
                        cw = image.height;
                        ch = image.width;
                        cx = -image.width;
                        deg = 270;
                        break;
                    default:
                        break;
                }

                canvas.width = cw;
                canvas.height = ch;
                ctx.rotate(deg * Math.PI / 180);
                ctx.drawImage(image, cx, cy);
                img = document.createElement("img");
                img.width = cw;
                img.height = ch;
                img.src = canvas.toDataURL("image/png");
            } else {
                img = image;
            }

            callback(img);
        });
    }
}
