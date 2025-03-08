import { useAnimations, useGLTF } from '@react-three/drei';
import React, { useEffect, useRef, useState } from 'react';
import { useRPMLipsync } from '../../hooks/useRPMLipsync';
import { useHeadTracking } from '../../hooks/useHeadTracking';

export function David(props) {
  const { nodes, materials, scene } = useGLTF(`${process.env.PUBLIC_URL}/models/David.glb`);
  const { animations } = useGLTF(`${process.env.PUBLIC_URL}/animations/animations.glb`);

  const anitaRef = useRef();
  const { actions, mixer } = useAnimations(animations, anitaRef);
  
  // 确保 animations 数据已加载
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      setIsLoaded(true);
    }
  }, [actions]);

  const [animation, setAnimation] = useState(
    animations.find((a) => a.name === 'Idle') ? 'Idle' : animations[0]?.name || '' // 避免 animations[0] 为 undefined
  );

  const { client } = props;

  useEffect(() => {
    if (client?.isTalking) {
      setAnimation('Talking_0');
    } else {
      setAnimation('Idle');
    }
  }, [client?.isTalking]);

  useEffect(() => {
    if (!isLoaded || !actions[animation]) return; // 确保 `actions` 加载完成
    let isMounted = true; // 追踪组件是否仍然存在

    actions[animation]
      .reset()
      .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
      .play();

    return () => {
      if (isMounted && actions[animation]) {
        actions[animation].fadeOut(0.5);
      }
      isMounted = false;
    };
  }, [animation, isLoaded, actions]);

  useRPMLipsync({ client, nodes, scene });
  useHeadTracking({ client, nodes, RPM: true });

  return (
    <group {...props} dispose={null} ref={anitaRef}>
      <primitive object={nodes.Hips} />
      <skinnedMesh name="Wolf3D_Body" geometry={nodes.Wolf3D_Body.geometry} material={materials.Wolf3D_Body} skeleton={nodes.Wolf3D_Body.skeleton} />
      <skinnedMesh name="Wolf3D_Outfit_Bottom" geometry={nodes.Wolf3D_Outfit_Bottom.geometry} material={materials.Wolf3D_Outfit_Bottom} skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton} />
      <skinnedMesh name="Wolf3D_Outfit_Footwear" geometry={nodes.Wolf3D_Outfit_Footwear.geometry} material={materials.Wolf3D_Outfit_Footwear} skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton} />
      <skinnedMesh name="Wolf3D_Outfit_Top" geometry={nodes.Wolf3D_Outfit_Top.geometry} material={materials.Wolf3D_Outfit_Top} skeleton={nodes.Wolf3D_Outfit_Top.skeleton} />
      <skinnedMesh name="Wolf3D_Hair" geometry={nodes.Wolf3D_Hair.geometry} material={materials.Wolf3D_Hair} skeleton={nodes.Wolf3D_Hair.skeleton} />
      <skinnedMesh name="EyeLeft" geometry={nodes.EyeLeft.geometry} material={materials.Wolf3D_Eye} skeleton={nodes.EyeLeft.skeleton} morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary} morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences} />
      <skinnedMesh name="EyeRight" geometry={nodes.EyeRight.geometry} material={materials.Wolf3D_Eye} skeleton={nodes.EyeRight.skeleton} morphTargetDictionary={nodes.EyeRight.morphTargetDictionary} morphTargetInfluences={nodes.EyeRight.morphTargetInfluences} />
      <skinnedMesh name="Wolf3D_Head" geometry={nodes.Wolf3D_Head.geometry} material={materials.Wolf3D_Skin} skeleton={nodes.Wolf3D_Head.skeleton} morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary} morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences} />
      <skinnedMesh name="Wolf3D_Teeth" geometry={nodes.Wolf3D_Teeth.geometry} material={materials.Wolf3D_Teeth} skeleton={nodes.Wolf3D_Teeth.skeleton} morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary} morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences} />
    </group>
  );
}

// 预加载 GLTF 模型和动画
useGLTF.preload(`${process.env.PUBLIC_URL}/models/David.glb`);
useGLTF.preload(`${process.env.PUBLIC_URL}/animations/animations.glb`);
