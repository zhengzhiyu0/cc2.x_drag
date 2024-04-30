import { DragDropMgr } from "./drag_lib/DragManger";

const { ccclass, property } = cc._decorator;

@ccclass
export default class DragItem extends cc.Component {

    public icon: cc.Sprite = null;

    onLoad() {
        this.icon = this.node.getComponent(cc.Sprite);
    }

    start() {
        this.setIcon(this.icon.spriteFrame);
    }

    setIcon(spriteFrame: cc.SpriteFrame) {
        DragDropMgr.getInstance().unregisterDragTarget(this.node);
        this.icon.spriteFrame = spriteFrame;
        if (spriteFrame) {
            DragDropMgr.getInstance().registerDragTarget(this.node, 0, (event) => {
                let node = event.currentTarget as Node;
                console.log(`DragDropScene-> click `, node);
            });
        }
    }

    // update (dt) {}
}
