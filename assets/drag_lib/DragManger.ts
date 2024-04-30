const { ccclass } = cc._decorator;

let _matrix = new cc.Mat4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
let _worldMatrix = new cc.Mat4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

declare global {
    interface ITNT {
        dragDropMgr: DragDropMgr;
    }
    export interface IDragAgentData {
        /**
         * 拖拽时显示的 SpriteFrame 或 cc.Node
         *
         * @type {(cc.SpriteFrame | cc.cc.Node)}
         * @memberof IDragAgentData
         */
        icon?: cc.SpriteFrame | cc.Node,
        /**
         * 拖拽时候所携带的数据，在放置的时候会传给 onDropDragAgent 方法
         *
         * @type {*}
         * @memberof IDragAgentData
         */
        sourceData?: any;

        /**
         * 可以对显示的节点进行处理
         *
         * @memberof IDragAgentData
         */
        onShow?: (node: cc.Node) => void;
    }

    interface IDragDropListener<SourceData = any> {

        /**
         * 触摸到监听面板，可以在这里做一些游戏逻辑的处理
         *
         * @param { cc.Event.EventTouch} event
         * @memberof IDragDropListener
         */
        onTouchTestPanelStart?(event: cc.Event.EventTouch);

        /**
         * 在监听面板上移动，可以在这里做一些游戏逻辑的处理
         *
         * @param { cc.Event.EventTouch} event
         * @memberof IDragDropListener
         */
        onTouchTestPanelMove?(event: cc.Event.EventTouch);

        /**
         * 触摸监听面板结束，可以在这里做一些游戏逻辑的处理
         *
         * @param { cc.Event.EventTouch} event
         * @memberof IDragDropListener
         */
        onTouchTestPanelEnd?(event: cc.Event.EventTouch);
        /**
         * 取消触摸监听面板，可以在这里做一些游戏逻辑的处理
         *
         * @param { cc.Event.EventTouch} event
         * @memberof IDragDropListener
         */
        onTouchTestPanelCancel?(event: cc.Event.EventTouch);


        /**
         * 如果不实现此方法则使用默认的方法查找被按压的节点
         *
         * @param { cc.Event.EventTouch} event
         * @param {Array<cc.Node>} dragNodes
         * @return {*}  {cc.Node}
         * @memberof IDragDropListener
         */
        onFindTarget?(event: cc.Event.EventTouch, dragNodes: Array<cc.Node>): cc.Node;

        /**
         * 查找容器
         *
         * @param {cc.Node} dragAgent 被拖拽的节点
         * @param {Array<cc.Node>} containers 容器数组
         * @param {(node1: cc.Node, node2: cc.Node) => boolean} intersects 一个判断是否相交的默认方法
         * @return {*}  {cc.Node}
         * @memberof IDragDropListener
         */
        onFindContainer?(dragAgent: cc.Node, containers: Array<cc.Node>, intersects: (node1: cc.Node, node2: cc.Node) => boolean): cc.Node;

        /**
         * 拖拽和容器相交
         *
         * @param {cc.Node} dragAgent 被拖拽的节点
         * @param {cc.Node} container 容器
         * @return void
         * @memberof IDragDropListener
         */
        onIntersects?(dragAgent: cc.Node, container: cc.Node, isIntersects: boolean): void;

        /**
         * 获取显示拖拽代理所需要的数据
         *
         * @param {cc.Node} touchTarget
         * @param {cc.Vec2} uiLocation
         * @return {*}  {IDragAgentData}
         * @memberof IDragDropListener
         */
        onCreateDragAgentData(touchTarget: cc.Node, uiLocation: cc.Vec2): IDragAgentData;

        /**
         * 拖放监听
         *
         * @param {cc.Node} container
         * @param {cc.Node} dragAgent
         * @param {SourceData} sourceData
         * @memberof IDragDropListener
         */
        onDropAgent(container: cc.Node, dragAgent: cc.Node, sourceData: SourceData);
    }
}
const NAME_AGENTICON = "AgentIcon";
let tmp_v3_1 = new cc.Vec3();
@ccclass('DragDropMgr')
export class DragDropMgr<SourceData = any> {
    private dragDropListener: IDragDropListener<SourceData>;
    private sourceData: SourceData = null;
    public dragAgent: cc.Node = null;


    //容器数组，为了做位置的判断
    private containers: Array<cc.Node> = [];
    // 需要拖拽的节点
    private dragNodes: Array<cc.Node> = [];

    // 点击面板
    private touchTestPanel: cc.Node = null;
    private touchStartPositon: cc.Vec3 = null;
    private isTouching = false;
    private delayShowDragAgent: Runnable = null;


    private autoRemove = true;

    private _delayMap = {};
    private _clickEventMap = {};
    private _delayShowTimer = null;
    private _currentTarget: cc.Node = null;

    public get dragging(): boolean {
        return this.dragAgent?.parent != null;
    }


    constructor() {
    }

    private lazyInit() {
        if (!this.dragAgent || !cc.isValid(this.dragAgent)) {
            this.dragAgent = new cc.Node();
            this.dragAgent.name = "AUTO_NAME_DRAG_AGENT";
            // this.dragAgent.layer = Layers.Enum.UI_2D;
            let sprite = this.dragAgent.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.RAW;
            sprite.type = cc.Sprite.Type.SIMPLE;
            sprite.trim = false;
            // this.dragAgent.draggable = true;
            this.dragAgent.on(cc.Node.DragEvent.DRAG_END, this.onDragEnd, this);
        }
    }
    /**
     * 注册监听器
     * @param dragDropListener 监听者
     * @param autoRemoveAgent 自动移除代理节点
     * @param touchTestPanel touch 检测节点 如果不传入则根据不同情况自动添加一个
     */
    public on(dragDropListener: IDragDropListener, autoRemoveAgent: boolean = true, touchTestPanel?: cc.Node) {
        if (!touchTestPanel) {
            let targetNode: cc.Node = null;
            // 如果传入的 监听器本身就是节点，则直接使用
            if (dragDropListener instanceof cc.Node) {
                targetNode = dragDropListener;
            }
            // @ts-ignore 
            // 如果传入的 监听器持有节点，则直接使用
            else if (dragDropListener.node && dragDropListener.node instanceof cc.Node) {
                // @ts-ignore
                targetNode = dragDropListener.node;
            }
            if (targetNode) {
                touchTestPanel = new cc.Node();
                touchTestPanel.name = "AUTO_TOUCH_TEST_PANEL";
                touchTestPanel.setContentSize(targetNode.getContentSize());
                touchTestPanel.parent = targetNode;
                touchTestPanel.position = cc.v3();
            } else {
                // 否则使用 画布节点
                let canvas = cc.director.getScene().getComponentInChildren(cc.Canvas);
                touchTestPanel = canvas.node;
            }
        }
        this.autoRemove = autoRemoveAgent;
        this.touchTestPanel = touchTestPanel;
        this.dragDropListener = dragDropListener;
        touchTestPanel.on(cc.Node.EventType.TOUCH_START, this.onTouchBegin, this);
        touchTestPanel.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        touchTestPanel.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        touchTestPanel.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);

    }

    public off(target: IDragDropListener) {
        let touchTestPanel = this.touchTestPanel;
        touchTestPanel.off(cc.Node.EventType.TOUCH_START, this.onTouchBegin, this);
        touchTestPanel.off(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        touchTestPanel.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        touchTestPanel.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        this.clear();
    }

    /**
     * 添加拖放容器
    */
    public addContainer(node: cc.Node) {
        this.containers.push(node);
    }

    /**
     * 移除指定的拖放容器
    */
    public removeContainer(node: cc.Node) {
        let idx = this.containers.indexOf(node);
        this.containers.splice(idx, 1);
    }

    /**
     * 移除所有的容器节点
     *
     * @memberof DragDropMgr
     */
    public removeAllContainer() {
        this.containers.length = 0;
    }
    /**
     * 移除所有注册的拖拽节点
     *
     * @memberof DragDropMgr
     */
    public remoeAllDragNode() {
        this.dragNodes.length = 0;
    }
    /**
     * 清理所有相关
     *
     * @memberof DragDropMgr
     */
    public clear() {
        this.remoeAllDragNode();
        this.removeAllContainer();
        this.clearTimer();
        if (this.dragAgent?.parent != null) {
            this.dragAgent.removeFromParent();
        }
    }

    /**
     * 注册单个拖拽节点
     * @param dragTarget 拖拽目标
     * @param delay 延迟弹出代理
     * @param clickEvent 点击事件
     */
    public registerDragTarget(dragTarget: cc.Node, delay: number = 0, clickEvent: TouchEventFunc = null) {
        if (!dragTarget) {
            console.error(`DragDropMgr-> dragTarget is null`);
            return;
        }
        if (this.dragNodes.indexOf(dragTarget) >= 0) {
            console.log(`DragDropMgr->已经注册过这个节点 ${dragTarget.name}`);
            return;
        }
        this.dragNodes.push(dragTarget);

        this._delayMap[dragTarget.uuid] = delay

        // clickEvent && this._clickEventMap.set(dragTarget.uuid, clickEvent);
        clickEvent && (this._clickEventMap[dragTarget.uuid] = clickEvent);
    }

    public unregisterDragTarget(dragTarget: cc.Node) {
        let index = this.dragNodes.indexOf(dragTarget);
        index >= 0 && this.dragNodes.splice(index, 1);
    }


    /**
     * 生成拖拽代理节点
     *
     * @protected
     * @param {cc.Node} source
     * @param {IDragAgentData} data
     * @return {*} 
     * @memberof DragDropMgr
     */
    protected startDrag(source: cc.Node, data: IDragAgentData) {
        if (this.dragging) {
            return;
        }
        let { icon, sourceData, onShow } = data;

        this.lazyInit();
        this.sourceData = sourceData;

        this.dragAgent.scale = 1;
        this.dragAgent.opacity = 255;

        //赋值 ico
        let dragIco = this.dragAgent.getComponent(cc.Sprite);
        if (icon && icon instanceof cc.SpriteFrame) {
            dragIco.spriteFrame = icon;
        } else {
            dragIco.spriteFrame = null;
            if (icon && icon instanceof cc.Node) {
                icon.parent = this.dragAgent;
                icon.name = NAME_AGENTICON;
                icon.position = new cc.Vec3();
            }
        }
        this.dragAgent.position = new cc.Vec3(this.touchStartPositon.x, this.touchStartPositon.y);
        this.dragAgent.parent = this.touchTestPanel;
        this.dragAgent.startDrag();

        this.sourceData = sourceData;
        onShow?.(this.dragAgent);
        return this.dragAgent;
    }

    private onDragEnd() {
        if (this.dragAgent.parent == null) {
            return;
        }
        let dragAgent = this.dragAgent;
        let sourceData = this.sourceData;
        let containers = this.containers;
        let container = null;

        if (this.dragDropListener.onFindContainer) {
            container = this.dragDropListener.onFindContainer(dragAgent, containers, this.intersects);
        } else {
            for (let i = 0; i < containers.length; i++) {
                const tempContainer = containers[i];
                if (this.intersects(tempContainer, dragAgent)) {
                    container = tempContainer;
                    break;
                }
            }
        }

        if (container?.hasEventListener(cc.Node.DragEvent.DROP)) {
            // 需要接收的参数有： 容器，拖拽物，源数据
            container.emit(cc.Node.DragEvent.DROP, container, dragAgent, sourceData);
        }

        //
        this.dragDropListener?.onDropAgent(container, dragAgent, sourceData);
        if (container && this.dragDropListener?.onIntersects) {
            container["intersects"] = false;
            this.dragDropListener?.onIntersects(dragAgent, container, false);
        }
        //自动移除节点
        if (dragAgent.parent != null) {
            dragAgent.stopDrag();
            dragAgent.removeDragEvent();
            if (this.autoRemove) {
                this.removeDragAgent();
            }
        }
    }

    /**
     * 判断是否相交
     *
     * @param {cc.Node} tempContainer
     * @param {cc.Node} dragAgent
     * @return {*} 
     * @memberof DragDropMgr
     */
    public intersects(tempContainer: cc.Node, dragAgent: cc.Node) {
        //计算 dragAgent 的中心点 是否在 container 上
        //如果在 则 break,并给 container 发送 drop 事件
        let containerBox = this._getBoundingBoxToWorld(tempContainer);
        if (containerBox == undefined || containerBox == null) {
            return false;
        }
        let dragAgentRect = this._getBoundingBoxToWorld(dragAgent);
        if (dragAgentRect == undefined || dragAgentRect == null) {
            return false;
        }
        if (containerBox.intersects(dragAgentRect)) {
            return true;
        }
        return false;
    }

    /**
     * 计算世界包围盒，但不包含子节点
     *
     * @private
     * @param {cc.Node} node
     * @return {*} 
     * @memberof DragDropMgr
     */
    private _getBoundingBoxToWorld(node: cc.Node) {
        if (!node.parent) {
            return
        }
        node.parent.getWorldMatrix(_worldMatrix);
        let mat4 = new cc.Mat4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        _matrix = mat4.fromRTS(node.getRotation(new cc.Quat()), cc.v3(node.getPosition()), cc.v3(node.getScale(cc.v3())));
        const width = node.getContentSize().width;
        const height = node.getContentSize().height;
        const rect = new cc.Rect(
            -node.anchorX * width,
            -node.anchorY * height,
            width,
            height,
        );

        mat4.mul(_matrix, _worldMatrix);

        const rect1 = new cc.Rect();
        rect.transformMat4(rect1, _worldMatrix);

        return rect1;
    }

    public removeDragAgent() {
        let icon = this.dragAgent.getChildByName(NAME_AGENTICON);
        // console.log("icon======", icon)
        if (icon) {
            icon.destroy();
        }
        this.dragAgent.removeFromParent();
    }
    private onTouchBegin(event: cc.Event.EventTouch) {
        // event.preventSwallow = true;
        this.dragDropListener?.onTouchTestPanelStart?.(event);
        let pos = event.getLocation();
        tmp_v3_1.set(cc.v3(pos));
        this.touchStartPositon = this.touchTestPanel.convertToNodeSpaceAR(tmp_v3_1, this.touchStartPositon);
        let node = this.findTouchedNode(event);
        if (!node) {
            return;
        }
        this.isTouching = true;
        this._currentTarget = node;
        // 点击开始延迟 n 秒之后弹出拖拽代理节点
        this.delayShowDragAgent = () => {
            // 延迟之后判断是否是按压状态
            if (this.isTouching) {
                this.isTouching = false;
                let data = this.dragDropListener?.onCreateDragAgentData(node, event.getLocation());
                this.startDrag(node, data);
            }
            this._delayShowTimer = null;
        }
        let delay = this._delayMap[node?.uuid] || 0;

        this.clearTimer();
        if (delay === 0) {
            this.delayShowDragAgent();
        } else {
            this._delayShowTimer = setTimeout(this.delayShowDragAgent, delay * 1000);
        }
    }
    private onTouchMove(event: cc.Event.EventTouch) {
        // 在有拖拽代理的时候 事件不允许派发给渲染在下一层级的节点
        if (this.dragAgent && this.dragAgent.activeInHierarchy) {
            // event.preventSwallow = false;
            this.dragAgent.emit(cc.Node.EventType.TOUCH_MOVE, event);
        } else {
            let location = event.getLocation();
            let startLocation = event.getStartLocation();
            // 这里做下处理，如果位移超过 10 像素，则代表不能进行拖拽
            if (Math.abs(startLocation.x - location.x) > 10 || Math.abs(startLocation.y - location.y) > 10) {
                this.isTouching = false;
                this.clearTimer();
            }
            // event.preventSwallow = true;
        }
        this.dragDropListener?.onTouchTestPanelMove?.(event);

        let dragAgent = this.dragAgent;
        let sourceData = this.sourceData;
        let containers = this.containers;
        let container = null;
        let func = this.dragDropListener?.onIntersects;
        if (func && dragAgent && containers) {
            for (let i = 0; i < containers.length; i++) {
                const tempContainer = containers[i];
                if (this.intersects(tempContainer, dragAgent)) {
                    container = tempContainer;
                    container["intersects"] = true;
                    break;
                }
            }

            if (container) {
                func(dragAgent, container, true);
            } else {
                // func(dragAgent, container, containers, false);
            }

            for (let i = 0; i < containers.length; i++) {
                const tempContainer = containers[i];
                if (tempContainer["intersects"] && tempContainer !== container) {
                    tempContainer["intersects"] = false;
                    func(dragAgent, tempContainer, false);
                }
            }
        }
    }
    private onTouchEnd(event: cc.Event.EventTouch) {
        if (this.dragAgent && this.dragAgent.activeInHierarchy) {
            this.dragAgent.emit(cc.Node.EventType.TOUCH_END, event);
        } else {
            if (this.isTouching && this._currentTarget) {
                if (this._clickEventMap[this._currentTarget.uuid]) {
                    let clickEventFunc = this._clickEventMap[this._currentTarget.uuid];
                    const clickEvent = new cc.Event.EventTouch(event.getTouches(), event.bubbles);
                    clickEvent.touch = event.touch;
                    // clickEvent.simulate = true;
                    clickEvent.currentTarget = this._currentTarget;
                    clickEventFunc?.(clickEvent);
                }
                this._currentTarget = null;
            }
        }
        this.isTouching = false;
        this.clearTimer();
        // event.preventSwallow = true;
        this.dragDropListener?.onTouchTestPanelEnd?.(event);
    }
    private onTouchCancel(event) {
        if (this.dragAgent && this.dragAgent.activeInHierarchy) {
            this.dragAgent.emit(cc.Node.EventType.TOUCH_CANCEL, event);
        }
        event.preventSwallow = true;
        this.dragDropListener?.onTouchTestPanelCancel?.(event);
    }

    /** 查找被按压的节点 */
    private findTouchedNode(event: cc.Event.EventTouch) {
        if (this.dragDropListener?.onFindTarget) {
            let node = this.dragDropListener?.onFindTarget(event, this.dragNodes);
            if (node) {
                return node;
            }
            CC_DEV && console.log(`DragDropMgr->  通过 dragDropListener.onFindTarget 没有查找到目标节点`);
        }
        let touchPos = event.getLocation();
        for (let index = 0; index < this.dragNodes.length; index++) {
            const node = this.dragNodes[index];
            if (!node.activeInHierarchy) {
                continue;
            }
            let box = node.getBoundingBoxToWorld();
            if (box.contains(touchPos)) {
                return node;
            }
        }
        return null;
    }

    private clearTimer() {
        if (this._delayShowTimer != null) {
            clearTimeout(this._delayShowTimer);
            this._delayShowTimer = null;
        }
    }

    private static _instance: DragDropMgr = null
    public static getInstance(): DragDropMgr {
        if (!this._instance) {
            this._instance = new DragDropMgr();
        }
        return this._instance;
    }
}


export { };