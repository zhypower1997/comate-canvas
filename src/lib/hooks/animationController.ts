const State = {
    PEN: "pen",
    RUBBER: "rubber",
    COLOR_PEN: "color_pen",
};

// 2. 动画状态机类
class AnimationFSM {
    currentState: string;
    animations: any;
    params: any;
    constructor(config: any) {
        this.currentState = State.PEN; // 默认状态
        this.animations = config.animations;
    }

    // 切换状态并执行动画
    async switchState(newState: string) {
        if (this.currentState === newState) return;
        const anim = this.animations[this.currentState].find((item: any) => item.nextState === newState);
        if (anim) {
            await anim.callback();
            this.currentState = newState;
        }
    }

}

export default AnimationFSM;