import { Canvas } from '@react-three/fiber';
import { Experience } from './components/Experience';
import { KeyboardControls, Loader } from '@react-three/drei';
import { useConvaiClient } from './hooks/useConvaiClient';
import ChatBubble from './components/chat/Chat';
import { getResetClickCount } from './components/chat/Chat'; // 导入动态变量
import { useState, useEffect} from 'react';


const CHARACTER_IDS = [
  "818d2b6e-6619-11ef-8904-42010a7be011", // Antoiane
  "a884e968-661a-11ef-93da-42010a7be011", // Ashline
  "89cc6766-661b-11ef-85d8-42010a7be011", // Charleen
  "b75d8c36-6626-11ef-ab22-42010a7be011", // Jax
];

const CHARACTER_MODELS = [
  "Antoiane", // Antoiane
  "Ashline", // Ashline
  "Charleen", // Charleen
  "Jax", // Jax
];


function App() {
  /**
   * 动态 characterID 状态
   */
  const [currentIndex, setCurrentIndex] = useState(0);

  // const [characterID, setCharacterID] = useState(
  //   'a884e968-661a-11ef-93da-42010a7be011' // Ashline
  //   // 默认值 (Jax)
  // );

  // useEffect(() => {
  //   // 定义一个更新 characterID 的函数
  //   const updateCharacterID = () => {
  //     const resetClickCount = getResetClickCount();
  //     let newCharacterID;

  //     if (resetClickCount % 4 === 0) {
  //       newCharacterID = '818d2b6e-6619-11ef-8904-42010a7be011'; // Antoiane
  //     } else if (resetClickCount % 4 === 1) {
  //       newCharacterID = 'a884e968-661a-11ef-93da-42010a7be011'; // Ashline
  //     } else if (resetClickCount % 4 === 2) {
  //       newCharacterID = '89cc6766-661b-11ef-85d8-42010a7be011'; // Charleen
  //     } else if (resetClickCount % 4 === 3) {
  //       newCharacterID = 'b75d8c36-6626-11ef-ab22-42010a7be011'; // Jax
  //     }

  //     // 如果 characterID 发生变化，更新状态并打印日志
  //     if (newCharacterID !== characterID) {
  //       setCharacterID(newCharacterID);
  //       console.log(`Updated characterID to: ${newCharacterID}, ClickCount: ${resetClickCount}`);
  //     }
  //   };

  //   // 添加定时器，定期检查 `resetClickCount` 的变化
  //   const interval = setInterval(updateCharacterID, 100); // 每 100ms 检查一次

  //   // 清除定时器，避免内存泄漏
  //   return () => clearInterval(interval);
  // }, [characterID]); // 监听 characterID 的变化

  const switchCharacter = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % CHARACTER_IDS.length);
  };

  // 使用动态更新的 characterID
  console.log(`current character ID: ${CHARACTER_IDS[currentIndex]}}`);
  const { client } = useConvaiClient(CHARACTER_IDS[currentIndex], '00728a1475eba58eb62542c313d667f0');

  return (
    <>
      {/* Next 按钮 */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '10px',
          width: '8vw',
          height: '2.5vw',
          color: 'white',
          display: 'flex',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000, // 确保按钮显示在前面
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(0, 0, 0, 1)')}
        onMouseLeave={(e) => (e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.7)')}
        onClick={switchCharacter}
      >  
        <div
          style={{
            alignSelf: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
        >
          <p style={{ fontSize: '0.78vw' }}>Next</p>
        </div>
      </div>


      <KeyboardControls
        map={[
          { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
          { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
          { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
          { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
          { name: 'sprint', keys: ['Shift'] },
          { name: 'jump', keys: ['Space'] },
        ]}
      >
        <Loader />
        <Canvas
          shadows
          camera={{
            position: [0, 0.8, 3],
            fov: 75,
          }}
        >
          <Experience client={client} model={CHARACTER_MODELS[currentIndex]} />
        </Canvas>
      </KeyboardControls>
      <ChatBubble client={client} />
    </>
  );
}

export default App;


// import { Canvas } from '@react-three/fiber';
// import { Experience } from './components/Experience';
// import { KeyboardControls, Loader } from '@react-three/drei';
// import { useConvaiClient } from './hooks/useConvaiClient';
// import ChatBubble from './components/chat/Chat';
// import { getResetClickCount } from './components/chat/Chat'; // 导入动态变量

// console.log('Reset button clicked:', getResetClickCount(), 'times');

// function App() {
//   /**
//    * 根据 getResetClickCount() 动态设置 characterID
//    */
//   let characterID = 'b75d8c36-6626-11ef-ab22-42010a7be011'; // 默认值

//   const resetClickCount = getResetClickCount(); // 获取动态点击次数

//   if (resetClickCount % 4 === 0) {
//     characterID = '818d2b6e-6619-11ef-8904-42010a7be011'; // Antoiane
//   } else if (resetClickCount % 4 === 1) {
//     characterID = 'a884e968-661a-11ef-93da-42010a7be011'; // Ashline
//   } else if (resetClickCount % 4 === 2) {
//     characterID = '89cc6766-661b-11ef-85d8-42010a7be011'; // Charleen
//   } else if (resetClickCount % 4 === 3) {
//     characterID = 'b75d8c36-6626-11ef-ab22-42010a7be011'; // Jax
//   }

//   // 使用动态 characterID
//   const { client } = useConvaiClient(characterID, '00728a1475eba58eb62542c313d667f0');

//   return (
//     <>
//       <KeyboardControls
//         map={[
//           { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
//           { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
//           { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
//           { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
//           { name: 'sprint', keys: ['Shift'] },
//           { name: 'jump', keys: ['Space'] },
//         ]}
//       >
//         <Loader />
//         <Canvas
//           shadows
//           camera={{
//             position: [0, 0.8, 3],
//             fov: 75,
//           }}
//         >
//           <Experience client={client} />
//         </Canvas>
//       </KeyboardControls>
//       <ChatBubble client={client} />
//     </>
//   );
// }

// export default App;

// import { Canvas } from '@react-three/fiber';
// import { Experience } from './components/Experience';
// import { KeyboardControls, Loader } from '@react-three/drei';
// import { useConvaiClient } from './hooks/useConvaiClient';
// import ChatBubble from './components/chat/Chat';
// import { getResetClickCount } from "./ChatBubble";

// console.log("Reset button clicked:", getResetClickCount(), "times");


// function App() {
//   /**
//    * Add apikey and character id here
//    */

//   // Antoiane: 818d2b6e-6619-11ef-8904-42010a7be011
//   // Ashline: a884e968-661a-11ef-93da-42010a7be011
//   // Charleen: 89cc6766-661b-11ef-85d8-42010a7be011
//   // Jax: b75d8c36-6626-11ef-ab22-42010a7be011 
//   const { client } = useConvaiClient('characterID', '00728a1475eba58eb62542c313d667f0');
//   return (
//     <>
//       <KeyboardControls
//         map={[
//           { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
//           { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
//           { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
//           { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
//           { name: 'sprint', keys: ['Shift'] },
//           { name: 'jump', keys: ['Space'] },
//         ]}
//       >
//         <Loader />
//         {/* <Leva /> */}
//         <Canvas
//           shadows
//           camera={{
//             position: [0, 0.8, 3],
//             fov: 75,
//           }}
//         >
//           <Experience client={client} />
//         </Canvas>
//       </KeyboardControls>
//       {/* {
//       client && */}
//       <ChatBubble client={client} />
//       {/* } */}
//     </>
//   );
// }

// export default App;
