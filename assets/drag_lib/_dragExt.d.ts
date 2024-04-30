declare module cc {
    interface Node {
        draggable: boolean;
        startDrag();
        stopDrag();
        removeDragEvent();
    }

    export namespace Node {
        export class DragEvent {
            static DRAG_START: string;
            static DRAG_MOVE: string;
            static DRAG_END: string;
            static DROP: string;
        }
    }
}
