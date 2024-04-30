import DragItem from "./DragItem";
import { DragDropMgr } from "./drag_lib/DragManger";

const {ccclass, property} = cc._decorator;

@ccclass
export default class ContainerItem extends cc.Component {

    public drag:DragItem = null;

    onLoad () {
        this.drag = this.node.getChildByName("drag").getComponent(DragItem);
        DragDropMgr.getInstance().addContainer(this.node);
    }

    start () {

    }

    // update (dt) {}
}
