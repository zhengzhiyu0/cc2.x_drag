import ContainerItem from "./ContainerItem";
import DragItem from "./DragItem";
import { DragDropMgr } from "./drag_lib/DragManger";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Scene extends cc.Component implements IDragDropListener {

    // onLoad () {}

    @property(cc.Node)
    touchPanel: cc.Node = null;

    // @property(cc.Node)
    // drag: cc.Node = null;

    // @property(cc.Node)
    // container: cc.Node = null;

    start() {
        DragDropMgr.getInstance().on(this, true, this.touchPanel);
        // DragDropMgr.getInstance().addContainer(this.container);
        // DragDropMgr.getInstance().registerDragTarget(this.drag, 0, (event) => {
        //     let node = event.currentTarget as Node;
        //     console.log(`DragDropScene-> click `, node);
        // });
    }

    onCreateDragAgentData(touchTarget: cc.Node, uiLocation: cc.Vec2): any {
        let icon = cc.instantiate(touchTarget);
        let dragItem = touchTarget.getComponent(DragItem);
        // icon.scale = v3(0.55, 0.55, 1);
        let spriteFrame = dragItem.icon.spriteFrame;
        dragItem.setIcon(null);
        return {
            icon: icon, // SpriteFrame | Node
            sourceData: { spriteFrame, dragItem }, // 【传递】的数据
        }
    }

    onDropAgent(container: cc.Node, dragAgent: cc.Node, sourceData: {
        spriteFrame: cc.SpriteFrame;
        dragItem: DragItem;
    }) {
        console.log("onDropAgent", { container, dragAgent, sourceData })
        if (container) {
            let containerItem = container.getComponent(ContainerItem);
            containerItem.drag.setIcon(sourceData.spriteFrame);
            sourceData.dragItem.setIcon(null);
        } else {
            sourceData.dragItem.setIcon(sourceData.spriteFrame);
        }
    }

    // update (dt) {}
}
