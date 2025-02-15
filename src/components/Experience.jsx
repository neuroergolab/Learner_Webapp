import {
  ContactShadows,
  OrbitControls,
  Sky,
  Stats,
} from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import { ConvaiFPS } from './fps/convaiFPS';
import { Anoitane } from './models/Anoitane';
import { Ashline } from './models/Ashline';
import { Jax } from './models/Jax';
import { Charlene } from './models/Charlene';
import { getResetClickCount } from './chat/Chat'; // 确保正确导入 resetClickCount

export const Experience = ({ client }) => {
  const [gravity, setGravity] = useState([0, 0, 0]);
  const [resetClickCount, setResetClickCount] = useState(getResetClickCount()); // ✅ 记录点击次数

  useEffect(() => {
    setGravity([0, -9.81, 0]);
  }, []);

  // **监听 resetClickCount 变化**
  useEffect(() => {
    const interval = setInterval(() => {
      setResetClickCount(getResetClickCount()); // 每 100ms 监听变化
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* lights */}
      <ambientLight intensity={1.0} />
      <hemisphereLight
        skyColor={'#fcf9d9'}
        groundColor={'#fcf9d9'}
        intensity={1.5}
      />
      <directionalLight
        position={[5, 10, 5]}
        color={'#ffffff'}
        intensity={2.5}
        castShadow
      />

      {/* Sky with Sun */}
      <Sky sunPosition={[100, 50, 100]} turbidity={10} />

      {/* models */}
      <Stats />
      <Suspense>
        <Physics gravity={gravity}>
          <ConvaiFPS />
          {/* 根据 resetClickCount 切换模型 */}
          {
            resetClickCount % 4 === 0 ? <Ashline client={client} /> :
            resetClickCount % 4 === 1 ? <Anoitane client={client} /> :
            resetClickCount % 4 === 2 ? <Charlene client={client} /> :
            <Jax client={client} />
          }


          {/* Gray Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color={'#808080'} />
          </mesh>

          {/* Colliders */}
          <RigidBody type="fixed">
            <CuboidCollider args={[5, 5, 0.1]} position={[0, 1.5, -3]} />
            <CuboidCollider
              args={[5, 5, 0.1]}
              position={[0, 1.5, 4]}
              rotation={[-Math.PI / 8, 0, 0]}
            />
            <CuboidCollider
              args={[5, 5, 0.1]}
              position={[0, -0.2, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
            <CuboidCollider
              args={[5, 5, 0.1]}
              position={[3, 1.5, 0]}
              rotation={[0, Math.PI / 2, 0]}
            />
            <CuboidCollider
              args={[5, 5, 0.1]}
              position={[-3, 1.5, 0]}
              rotation={[0, Math.PI / 2, 0]}
            />
          </RigidBody>
        </Physics>
      </Suspense>
      <ContactShadows opacity={0.7} />
    </>
  );
};


// import {
//   ContactShadows,
//   OrbitControls,
//   Sky,
//   Stats,
// } from '@react-three/drei';
// import { Suspense, useEffect, useState } from 'react';
// import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
// import { ConvaiFPS } from './fps/convaiFPS';
// import { Anoitane } from './models/Anoitane';
// import { Anita } from './models/Anita';

// export const Experience = ({ client }) => {
//   const [gravity, setGravity] = useState([0, 0, 0]);

//   useEffect(() => {
//     setGravity([0, -9.81, 0]);
//   }, []);

//   return (
//     <>
//       {/* lights */}
//       <ambientLight intensity={1.0} />
//       <hemisphereLight
//         skyColor={'#fcf9d9'}
//         groundColor={'#fcf9d9'}
//         intensity={1.5}
//       />
//       <directionalLight
//         position={[5, 10, 5]}
//         color={'#ffffff'}
//         intensity={2.5}
//         castShadow
//       />

//       {/* Sky with Sun */}
//       <Sky sunPosition={[100, 50, 100]} turbidity={10} />

//       {/* models */}
//       <Stats />
//       <Suspense>
//         <Physics gravity={gravity}>
//           <ConvaiFPS />
//           <Anoitane client={client} />
//           {/* Gray Ground */}
//           <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
//             <planeGeometry args={[100, 100]} />
//             <meshStandardMaterial color={'#808080'} />
//           </mesh>

//           {/* Colliders */}
//           <RigidBody type="fixed">
//             <CuboidCollider args={[5, 5, 0.1]} position={[0, 1.5, -3]} />
//             <CuboidCollider
//               args={[5, 5, 0.1]}
//               position={[0, 1.5, 4]}
//               rotation={[-Math.PI / 8, 0, 0]}
//             />
//             <CuboidCollider
//               args={[5, 5, 0.1]}
//               position={[0, -0.2, 0]}
//               rotation={[Math.PI / 2, 0, 0]}
//             />
//             <CuboidCollider
//               args={[5, 5, 0.1]}
//               position={[3, 1.5, 0]}
//               rotation={[0, Math.PI / 2, 0]}
//             />
//             <CuboidCollider
//               args={[5, 5, 0.1]}
//               position={[-3, 1.5, 0]}
//               rotation={[0, Math.PI / 2, 0]}
//             />
//           </RigidBody>
//         </Physics>
//       </Suspense>
//       <ContactShadows opacity={0.7} />
//     </>
//   );
// };

// // import {
// //   ContactShadows,
// //   Grid,
// //   OrbitControls,
// //   Sky,
// //   Stats,
// // } from '@react-three/drei';
// // import { Suspense, useEffect, useState } from 'react';
// // import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
// // import { ConvaiFPS } from './fps/convaiFPS';
// // import { Anita } from './models/Anita';
// // export const Experience = ({ client }) => {
// //   const [gravity, setGravity] = useState([0, 0, 0]);
// //   useEffect(() => {
// //     setGravity([0, -9.81, 0]);
// //   }, []);

// //   return (
// //     <>
// //       {/* lights */}
// //       <ambientLight intensity={0.2} />
// //       <hemisphereLight
// //         skyColor={'#fcf9d9'}
// //         groundColor={'#fcf9d9'}
// //         intensity={0.5}
// //         castShadow
// //       />
// //       <directionalLight
// //         position={[500, 100, 500]}
// //         color={'#fcf9d9'}
// //         intensity={2}
// //         castShadow
// //       />

// //       {/* models */}
// //       <Stats />
// //       <Suspense>
// //         <Physics gravity={gravity}>
// //           <ConvaiFPS />
// //           <Anita client={client} />
// //           <Sky />
// //           <Grid followCamera infiniteGrid fadeDistance={50} />
// //           <RigidBody type="fixed">
// //             <CuboidCollider args={[5, 5, 0.1]} position={[0, 1.5, -3]} />
// //             <CuboidCollider
// //               args={[5, 5, 0.1]}
// //               position={[0, 1.5, 4]}
// //               rotation={[-Math.PI / 8, 0, 0]}
// //             />
// //             <CuboidCollider
// //               args={[5, 5, 0.1]}
// //               position={[0, -0.2, 0]}
// //               rotation={[Math.PI / 2, 0, 0]}
// //             />
// //             <CuboidCollider
// //               args={[5, 5, 0.1]}
// //               position={[3, 1.5, 0]}
// //               rotation={[0, Math.PI / 2, 0]}
// //             />
// //             <CuboidCollider
// //               args={[5, 5, 0.1]}
// //               position={[-3, 1.5, 0]}
// //               rotation={[0, Math.PI / 2, 0]}
// //             />
// //           </RigidBody>
// //         </Physics>
// //       </Suspense>
// //       <ContactShadows opacity={0.7} />
// //     </>
// //   );
// // };
