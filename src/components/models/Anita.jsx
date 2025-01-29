import { useAnimations, useGLTF } from '@react-three/drei';
import React, { useEffect, useRef, useState } from 'react';
import { useRPMLipsync } from '../../hooks/useRPMLipsync';
import { useHeadTracking } from '../../hooks/useHeadTracking';

export function Anita(props) {
  const { nodes, materials, scene } = useGLTF(`${process.env.PUBLIC_URL}/models/Ashline.glb`);
  // const { nodes, materials, scene } = useGLTF('/models/Ashline.glb');
  const { animations } = useGLTF('/animations/animations.glb');
  const anitaRef = useRef();
  const { actions, mixer } = useAnimations(animations, anitaRef);
  const [animation, setAnimation] = useState(
    animations.find((a) => a.name === 'Idle') ? 'Idle' : animations[0].name // Check if Idle animation exists otherwise use first animation
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
    actions[animation]
      .reset()
      .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
      .play();
    return () => actions[animation].fadeOut(0.5);
  }, [animation]);

  useRPMLipsync({ client, nodes, scene });
  useHeadTracking({ client, nodes, RPM: true });
  return (
    <group {...props} dispose={null} ref={anitaRef}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="Wolf3D_Body"
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Bottom"
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Footwear"
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Top"
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Hair"
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

useGLTF.preload('/models/Ashline.glb');
useGLTF.preload('/animations/animations.glb');

// import { useAnimations, useGLTF } from '@react-three/drei';
// import React, { useEffect, useRef, useState } from 'react';
// import { useRPMLipsync } from '../../hooks/useRPMLipsync';
// import { useHeadTracking } from '../../hooks/useHeadTracking';
// import { getResetClickCount } from '../chat/Chat'; // 导入动态变量

// export function Anita(props) {
//   // 使用状态保存当前的模型文件路径
//   const [modelFile, setModelFile] = useState('/models/Anoitane.glb'); // 默认值

//   useEffect(() => {
//     // 获取当前点击次数
//     const resetClickCount = getResetClickCount();

//     // 根据 resetClickCount 动态设置模型文件路径
//     if (resetClickCount % 4 === 0) {
//       setModelFile('/models/Anoitane.glb');
//     } else if (resetClickCount % 4 === 1) {
//       setModelFile('/models/Ashline.glb');
//     } else if (resetClickCount % 4 === 2) {
//       setModelFile('/models/Charlene.glb');
//     } else if (resetClickCount % 4 === 3) {
//       setModelFile('/models/Jax.glb');
//     }

//     // 动态预加载对应的 .glb 文件
//     if (resetClickCount % 4 === 0) {
//       useGLTF.preload('/models/Anoitane.glb');
//     } else if (resetClickCount % 4 === 1) {
//       useGLTF.preload('/models/Ashline.glb');
//     } else if (resetClickCount % 4 === 2) {
//       useGLTF.preload('/models/Charlene.glb');
//     } else if (resetClickCount % 4 === 3) {
//       useGLTF.preload('/models/Jax.glb');
//     }
//   }, []); // 空依赖数组确保预加载逻辑只在组件挂载时运行

//   // 动态加载模型文件
//   const { nodes, materials, scene } = useGLTF(/models/Ashline.glb);
//   const { animations } = useGLTF('/animations/animations.glb');
//   const anitaRef = useRef();
//   const { actions, mixer } = useAnimations(animations, anitaRef);
//   const [animation, setAnimation] = useState(
//     animations.find((a) => a.name === 'Idle') ? 'Idle' : animations[0].name // 检查是否存在 Idle 动画，否则使用第一个动画
//   );
//   const { client } = props;

//   useEffect(() => {
//     if (client?.isTalking) {
//       setAnimation('Talking_0');
//     } else {
//       setAnimation('Idle');
//     }
//   }, [client?.isTalking]);

//   useEffect(() => {
//     actions[animation]
//       .reset()
//       .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
//       .play();
//     return () => actions[animation].fadeOut(0.5);
//   }, [animation]);

//   useRPMLipsync({ client, nodes, scene });
//   useHeadTracking({ client, nodes, RPM: true });

//   return (
//     <group {...props} dispose={null} ref={anitaRef}>
//       <primitive object={nodes.Hips} />
//       <skinnedMesh
//         name="Wolf3D_Body"
//         geometry={nodes.Wolf3D_Body.geometry}
//         material={materials.Wolf3D_Body}
//         skeleton={nodes.Wolf3D_Body.skeleton}
//       />
//       <skinnedMesh
//         name="Wolf3D_Outfit_Bottom"
//         geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
//         material={materials.Wolf3D_Outfit_Bottom}
//         skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
//       />
//       <skinnedMesh
//         name="Wolf3D_Outfit_Footwear"
//         geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
//         material={materials.Wolf3D_Outfit_Footwear}
//         skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
//       />
//       <skinnedMesh
//         name="Wolf3D_Outfit_Top"
//         geometry={nodes.Wolf3D_Outfit_Top.geometry}
//         material={materials.Wolf3D_Outfit_Top}
//         skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
//       />
//       <skinnedMesh
//         name="Wolf3D_Hair"
//         geometry={nodes.Wolf3D_Hair.geometry}
//         material={materials.Wolf3D_Hair}
//         skeleton={nodes.Wolf3D_Hair.skeleton}
//       />
//       <skinnedMesh
//         name="EyeLeft"
//         geometry={nodes.EyeLeft.geometry}
//         material={materials.Wolf3D_Eye}
//         skeleton={nodes.EyeLeft.skeleton}
//         morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
//         morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
//       />
//       <skinnedMesh
//         name="EyeRight"
//         geometry={nodes.EyeRight.geometry}
//         material={materials.Wolf3D_Eye}
//         skeleton={nodes.EyeRight.skeleton}
//         morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
//         morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
//       />
//       <skinnedMesh
//         name="Wolf3D_Head"
//         geometry={nodes.Wolf3D_Head.geometry}
//         material={materials.Wolf3D_Skin}
//         skeleton={nodes.Wolf3D_Head.skeleton}
//         morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
//         morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
//       />
//       <skinnedMesh
//         name="Wolf3D_Teeth"
//         geometry={nodes.Wolf3D_Teeth.geometry}
//         material={materials.Wolf3D_Teeth}
//         skeleton={nodes.Wolf3D_Teeth.skeleton}
//         morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
//         morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
//       />
//     </group>
//   );
// }

// // 动态预加载动画文件

// useGLTF.preload('/animations/animations.glb');


// // import { useAnimations, useGLTF } from '@react-three/drei';
// // import React, { useEffect, useRef, useState } from 'react';
// // import { useRPMLipsync } from '../../hooks/useRPMLipsync';
// // import { useHeadTracking } from '../../hooks/useHeadTracking';
// // import { getResetClickCount } from '../chat/Chat'; // 导入动态变量

// // export function Anita(props) {
// //   // 获取当前的点击次数
// //   const resetClickCount = getResetClickCount();

// //   // 根据 resetClickCount 动态设置 .glb 文件名
// //   let modelFile = '/models/Anoitane.glb';
// //   if (resetClickCount % 4 === 0) {
// //     modelFile = '/models/Anoitane.glb';
// //   } else if (resetClickCount % 4 === 1) {
// //     modelFile = '/models/Ashline.glb';
// //   } else if (resetClickCount % 4 === 2) {
// //     modelFile = '/models/Charlene.glb';
// //   } else if (resetClickCount % 4 === 3) {
// //     modelFile = '/models/Jax.glb';
// //   }
// //   const { nodes, materials, scene } = useGLTF(modelFile);
// //   const { animations } = useGLTF('/animations/animations.glb');
// //   const anitaRef = useRef();
// //   const { actions, mixer } = useAnimations(animations, anitaRef);
// //   const [animation, setAnimation] = useState(
// //     animations.find((a) => a.name === 'Idle') ? 'Idle' : animations[0].name // Check if Idle animation exists otherwise use first animation
// //   );
// //   const { client } = props;
// //   useEffect(() => {
// //     if (client?.isTalking) {
// //       setAnimation('Talking_0');
// //     } else {
// //       setAnimation('Idle');
// //     }
// //   }, [client?.isTalking]);
// //   useEffect(() => {
// //     actions[animation]
// //       .reset()
// //       .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
// //       .play();
// //     return () => actions[animation].fadeOut(0.5);
// //   }, [animation]);

// //   useRPMLipsync({ client, nodes, scene });
// //   useHeadTracking({ client, nodes, RPM: true });
// //   return (
// //     <group {...props} dispose={null} ref={anitaRef}>
// //       <primitive object={nodes.Hips} />
// //       <skinnedMesh
// //         name="Wolf3D_Body"
// //         geometry={nodes.Wolf3D_Body.geometry}
// //         material={materials.Wolf3D_Body}
// //         skeleton={nodes.Wolf3D_Body.skeleton}
// //       />
// //       <skinnedMesh
// //         name="Wolf3D_Outfit_Bottom"
// //         geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
// //         material={materials.Wolf3D_Outfit_Bottom}
// //         skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
// //       />
// //       <skinnedMesh
// //         name="Wolf3D_Outfit_Footwear"
// //         geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
// //         material={materials.Wolf3D_Outfit_Footwear}
// //         skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
// //       />
// //       <skinnedMesh
// //         name="Wolf3D_Outfit_Top"
// //         geometry={nodes.Wolf3D_Outfit_Top.geometry}
// //         material={materials.Wolf3D_Outfit_Top}
// //         skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
// //       />
// //       <skinnedMesh
// //         name="Wolf3D_Hair"
// //         geometry={nodes.Wolf3D_Hair.geometry}
// //         material={materials.Wolf3D_Hair}
// //         skeleton={nodes.Wolf3D_Hair.skeleton}
// //       />
// //       <skinnedMesh
// //         name="EyeLeft"
// //         geometry={nodes.EyeLeft.geometry}
// //         material={materials.Wolf3D_Eye}
// //         skeleton={nodes.EyeLeft.skeleton}
// //         morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
// //         morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
// //       />
// //       <skinnedMesh
// //         name="EyeRight"
// //         geometry={nodes.EyeRight.geometry}
// //         material={materials.Wolf3D_Eye}
// //         skeleton={nodes.EyeRight.skeleton}
// //         morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
// //         morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
// //       />
// //       <skinnedMesh
// //         name="Wolf3D_Head"
// //         geometry={nodes.Wolf3D_Head.geometry}
// //         material={materials.Wolf3D_Skin}
// //         skeleton={nodes.Wolf3D_Head.skeleton}
// //         morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
// //         morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
// //       />
// //       <skinnedMesh
// //         name="Wolf3D_Teeth"
// //         geometry={nodes.Wolf3D_Teeth.geometry}
// //         material={materials.Wolf3D_Teeth}
// //         skeleton={nodes.Wolf3D_Teeth.skeleton}
// //         morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
// //         morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
// //       />
// //     </group>
// //   );
// // }

// // // 动态预加载对应的 .glb 文件
// // if (getResetClickCount() % 4 === 0) {
// //   useGLTF.preload('/models/Anoitane.glb');
// // } else if (getResetClickCount() % 4 === 1) {
// //   useGLTF.preload('/models/Ashline.glb');
// // } else if (getResetClickCount() % 4 === 2) {
// //   useGLTF.preload('/models/Charlene.glb');
// // } else if (getResetClickCount() % 4 === 3) {
// //   useGLTF.preload('/models/Jax.glb');
// // }

// // useGLTF.preload('/animations/animations.glb');
