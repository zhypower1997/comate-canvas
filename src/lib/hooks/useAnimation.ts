"use client"
import { useRef, useEffect } from "react";
import AnimationFSM from "./animationController";

enum BoneEvent {
    pen = "pen",
    color_pen = "color_pen",
    rubber = "rubber",
    small_platte = "small_platte",
}

interface IAnimation {
    spineControls: any
}

export function useAnimation({ spineControls }: IAnimation) {
    const animationFSM = useRef<AnimationFSM>(null);
    useEffect(() => {
        const AnimationTrackIndex = {
            pen: 1,
            color_pen: 2,
            rubber: 3,
            color_size: 4,
            small_platte: 5,
        }
        const config = {
            [BoneEvent.pen]: [
                {
                    nextState: BoneEvent.rubber, callback: () => {
                        spineControls.playAnimation("rubber_start", false, AnimationTrackIndex.rubber);
                        spineControls.playAnimation("pen_close", false, AnimationTrackIndex.pen);
                    }
                },
                {
                    nextState: BoneEvent.color_pen, callback: () => {
                        spineControls.playAnimation("color_pen_start", false, AnimationTrackIndex.color_pen);
                        spineControls.playAnimation("pen_close", false, AnimationTrackIndex.pen);
                        spineControls.playAnimation("color_size_in", false, AnimationTrackIndex.color_size);
                    }
                },
            ],
            [BoneEvent.rubber]: [
                {
                    nextState: BoneEvent.pen, callback: () => {
                        spineControls.playAnimation("pen_start", false, AnimationTrackIndex.pen);
                        spineControls.playAnimation("rubber_close", false, AnimationTrackIndex.rubber);
                    }
                },
                {
                    nextState: BoneEvent.color_pen, callback: () => {
                        spineControls.playAnimation("color_pen_start", false, AnimationTrackIndex.color_pen);
                        spineControls.playAnimation("rubber_close", false, AnimationTrackIndex.rubber);
                        spineControls.playAnimation("color_size_in", false, AnimationTrackIndex.color_size);
                    }
                },
            ],
            [BoneEvent.color_pen]: [
                {
                    nextState: BoneEvent.pen, callback: () => {
                        spineControls.playAnimation("pen_start", false, AnimationTrackIndex.pen);
                        spineControls.playAnimation("color_pen_close", false, AnimationTrackIndex.color_pen);
                        spineControls.playAnimation("color_size_out", false, AnimationTrackIndex.color_size);
                    }
                },
                {
                    nextState: BoneEvent.rubber, callback: () => {
                        spineControls.playAnimation("rubber_start", false, AnimationTrackIndex.rubber);
                        spineControls.playAnimation("color_pen_close", false, AnimationTrackIndex.color_pen);
                        spineControls.playAnimation("color_size_out", false, AnimationTrackIndex.color_size);
                    }
                },
            ],
        }
        animationFSM.current = new AnimationFSM({ animations: config });

    }, [])
    return animationFSM;
}
