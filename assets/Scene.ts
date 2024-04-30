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

    @property(cc.Node)
    containers: cc.Node = null;

    containerItems: ContainerItem[] = [];

    start() {

        this.containerItems = [];
        for (let i = 0; i < this.containers.children.length; i++) {
            const node = this.containers.children[i];
            this.containerItems.push(node.getComponent(ContainerItem));
        }

        DragDropMgr.getInstance().on(this, true, this.touchPanel);
        // DragDropMgr.getInstance().addContainer(this.container);
        // DragDropMgr.getInstance().registerDragTarget(this.drag, 0, (event) => {
        //     let node = event.currentTarget as Node;
        //     console.log(`DragDropScene-> click `, node);
        // });

        this.dragMoveFromTo(0, 3);
    }

    convertPos(fromNode: cc.Node, toNode: cc.Node) {
        let worldPosA = fromNode.convertToWorldSpaceAR(cc.v2());
        let localPosB = toNode.convertToNodeSpaceAR(worldPosA);
        return localPosB;
    }

    /**
     * 动画，将某一个拖拽节点移动到指定的拖拽节点上，然后消失
     * @param moveIdx 
     * @param toIdx 
     * @param callack 
     */
    dragMoveFromTo(moveIdx: number, toIdx: number, callack?: Function) {
        let moveDragItem = this.containerItems[moveIdx].drag,
            toDragItem = this.containerItems[toIdx].drag;
        let tempNode = cc.instantiate(moveDragItem.node);
        tempNode.getComponent(DragItem).enabled = false;
        tempNode.parent = this.node;
        moveDragItem.setIcon(null);
        tempNode.setPosition(this.convertPos(moveDragItem.node, this.node));

        let toPos = this.convertPos(toDragItem.node, this.node);
        cc
            .tween(tempNode)
            .to(0.5, { position: cc.v3(toPos) }, { easing: 'quadIn' })
            .call(() => {
                tempNode.destroy();
                callack && callack();
            })
            .start();
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
            //这里需要根据目标是否和拖拽一致，一致则合成，不一致则回退
            let containerItem = container.getComponent(ContainerItem);
            if (!containerItem.drag.getIcon()) {
                sourceData.dragItem.setIcon(sourceData.spriteFrame);
                return;
            }
            sourceData.dragItem.setIcon(null);
            containerItem.drag.setIcon(sourceData.spriteFrame);
        } else {
            sourceData.dragItem.setIcon(sourceData.spriteFrame);
        }
    }

    // update (dt) {}
}
