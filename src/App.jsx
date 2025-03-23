import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { KeyboardControls, Loader } from "@react-three/drei";
import { useConvaiClient } from "./hooks/useConvaiClient";
import ChatBubble from "./components/chat/Chat";
import { useState, useEffect } from "react";
import { uploadData } from "./helpers/datapipeAPI";

// Updated character arrays with practice characters (Harry and James) at the beginning
const CHARACTER_IDS = [
  // Practice characters
  "8e14f716-656c-11ef-9d91-42010a7be011", // Harry
  "bc5688ec-656c-11ef-b1a4-42010a7be011", // James
  // Main study characters
  "818d2b6e-6619-11ef-8904-42010a7be011", // Antoiane
  "a884e968-661a-11ef-93da-42010a7be011", // Ashline
  "89cc6766-661b-11ef-85d8-42010a7be011", // Charleen
  "b75d8c36-6626-11ef-ab22-42010a7be011", // Jax
  "ea1c4d1e-6627-11ef-93da-42010a7be011", // Jessie
  "a4dff092-64a7-11ef-a91e-42010a7be011", // Alfred
  "e9ac9844-6617-11ef-b5d4-42010a7be011", // Amber
  "7e114f7a-661d-11ef-ab22-42010a7be011", // Charlene
  "850067ac-63b2-11ef-be21-42010a7be011", // David
  "8dc2e6c6-661e-11ef-8a10-42010a7be011", // Devon
  "7625aa3e-661f-11ef-864f-42010a7be011", // Disire
  "6d227976-6624-11ef-8904-42010a7be011", // India
  "e841ed80-6624-11ef-93da-42010a7be011", // Issac
  "26aa1774-6629-11ef-a179-42010a7be011", // Matthew
  "2cb1c924-662d-11ef-8a10-42010a7be011", // Ronald
  "a8a061d4-662e-11ef-ab87-42010a7be011", // Sadie
];

const CHARACTER_LLM = ["LLM1", "LLM1", "LLM4", "LLM2", "LLM1", "LLM3", "LLM2", "LLM4", "LLM4", "LLM2", "LLM1", "LLM3", "LLM1", "LLM3", "LLM2", "LLM3", "LLM4", "LLM1"];
const CHARACTER_CONDUCT = ["C", "C", "C", "C", "NC", "NC", "NC", "NC", "C", "NC", "C", "NC", "NC", "C", "C", "C", "NC", "C"];
const CHARACTER_NEURODIVERSITY = ["NT", "NT", "NT", "ND", "ND", "NT", "NT", "ND", "ND", "ND", "ND", "ND", "NT", "NT", "NT", "ND", "NT", "NT"];
const CHARACTER_MODELS = ["Harry", "James", "Antoiane", "Ashline", "Charleen", "Jax", "Jessie", "Alfred", "Amber", "Charlene", "David", "Devon", "Disire", "India", "Issac", "Matthew", "Ronald", "Sadie"];

// // Workflow stages (新增 PRACTICE_INSTRUCTION 阶段)
// const STAGES = {
//   INTRO: "intro",
//   PRACTICE_INSTRUCTION: "practiceInstruction",
//   PRACTICE: "practice",
//   PRACTICE_COMPLETE: "practiceComplete",
//   MAIN_STUDY: "mainStudy"
// };
const STAGES = {
  INTRO: "intro",
  PRACTICE_INSTRUCTION: "practiceInstruction",
  PRACTICE: "practice",
  PRACTICE_COMPLETE: "practiceComplete",
  MAIN_STUDY: "mainStudy",
  AI_READINESS: "aiReadiness",
  FINAL_CODE: "finalCode" // 新增最终阶段
};

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Generates a random order for main study characters (indexes 2-17)
 */
const generateRandomOrder = () => {
  // Create array of indices from 2 to 17 (16 main study characters)
  const indices = Array.from({ length: 16 }, (_, i) => i + 2);
  
  // Fisher-Yates shuffle algorithm
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  return indices;
};

/**
 * Retrieves the saved character index from localStorage safely.
 */
const getSavedIndex = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("currentIndex");
      return saved ? parseInt(saved, 10) : 0;
    } catch (error) {
      console.error("Failed to read from localStorage:", error);
      return 0;
    }
  }
  return 0;
};

/**
 * Retrieves the saved workflow stage from localStorage safely.
 */
const getSavedStage = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("currentStage");
      return saved || STAGES.INTRO;
    } catch (error) {
      console.error("Failed to read stage from localStorage:", error);
      return STAGES.INTRO;
    }
  }
  return STAGES.INTRO;
};

/**
 * Retrieves the random order array from localStorage, or generates a new one
 */
const getSavedRandomOrder = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("randomOrder");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to read randomOrder from localStorage:", error);
    }
  }
  return generateRandomOrder();
};

/**
 * Gets the current position in the random order sequence
 */
const getSavedOrderPosition = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("orderPosition");
      return saved ? parseInt(saved, 10) : 0;
    } catch (error) {
      console.error("Failed to read orderPosition from localStorage:", error);
      return 0;
    }
  }
  return 0;
};

function App() {
  const [currentIndex, setCurrentIndex] = useState(getSavedIndex);
  const [currentStage, setCurrentStage] = useState(getSavedStage);
  const [randomOrder, setRandomOrder] = useState(getSavedRandomOrder);
  const [orderPosition, setOrderPosition] = useState(getSavedOrderPosition);
  const [showWarning, setShowWarning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showInteractionCue, setShowInteractionCue] = useState(true);

  /**
   * Stores values in localStorage safely.
   */
  const safeSetLocalStorage = (key, value) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn("Failed to write to localStorage:", error);
      }
    }
  };

  /**
   * Converts messages array to CSV format with all required fields
   * @param {Array} messages - Array of message objects
   * @returns {String} CSV formatted string
   */
  const convertMessagesToCSV = (messages) => {
    const csvRows = ["timestamp,speaker,model,conduct,neurodiversity,content"]; // CSV Header without extra spaces and commas
    messages.forEach(({ sender, content, timestamp, llmModel, llmConduct, llmNeuro }) => {
      csvRows.push(`"${timestamp}","${sender}","${llmModel}","${llmConduct}","${llmNeuro}","${content.replace(/"/g, '""')}"`);
    });
    return csvRows.join("\n");
  };

  /**
   * Resets the chat state when switching characters
   */
  const resetState = () => {
    console.log("resetState for index=", currentIndex);
    setMessages([]);
    if (client?.convaiClient?.current) {
      client.convaiClient.current.resetSession();
    }
    client?.setUserText("");
    client?.setNpcText("");
    
    // Clear the character's chat history in localStorage more thoroughly
    const characterId = CHARACTER_IDS[currentIndex];
    try {
      // Get all stored messages
      const storedData = localStorage.getItem("messages");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Clear this character's messages
        if (parsedData[characterId]) {
          parsedData[characterId] = {
            sessionID: -1,
            message: [],
          };
          localStorage.setItem("messages", JSON.stringify(parsedData));
        }
        
        // Also ensure we're not viewing cached messages in the state
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to reset localStorage:", error);
      // As a fallback, try to clear all messages
      try {
        localStorage.removeItem("messages");
      } catch (e) {
        console.error("Failed to remove all messages:", e);
      }
    }
    
    // Reset and show interaction cue when switching characters
    setShowInteractionCue(true);
  };

  /**
   * Generates a unique user ID for the questionnaire
   * @returns {String} Unique identifier
   */
  const generateUserID = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  };

  const clearAllMessageData = () => {
    try {
      // 完全删除localStorage中的messages条目
      localStorage.removeItem("messages");
      console.log("所有消息数据已清除");
      
      // 重置状态中的messages数组
      setMessages([]);
      
      // 如果client存在，重置convai客户端会话
      if (client?.convaiClient?.current) {
        client.convaiClient.current.resetSession();
      }
      
      // 重置客户端文本输入状态
      client?.setUserText("");
      client?.setNpcText("");
      
      // 显示交互提示
      setShowInteractionCue(true);
    } catch (error) {
      console.error("清除所有消息数据失败:", error);
    }
  };

  // /**
  //  * Gets the current chat history from localStorage
  //  * @returns {Array} Array of message objects
  //  */
  // const getStoredMessages = () => {
  //   try {
  //     const characterId = CHARACTER_IDS[currentIndex];
  //     const storedData = localStorage.getItem("messages");
      
  //     if (storedData) {
  //       const parsedData = JSON.parse(storedData);
  //       if (parsedData[characterId] && Array.isArray(parsedData[characterId].message)) {
  //         return parsedData[characterId].message;
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Failed to get stored messages:", error);
  //   }
  //   return [];
  // };
  // Also modify getStoredMessages to ensure we only get messages for the current character
  const getStoredMessages = () => {
    try {
      const characterId = CHARACTER_IDS[currentIndex];
      const storedData = localStorage.getItem("messages");
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData[characterId] && Array.isArray(parsedData[characterId].message)) {
          console.log(`Retrieved ${parsedData[characterId].message.length} messages for character ${characterId}`);
          return parsedData[characterId].message;
        }
      }
    } catch (error) {
      console.error("Failed to get stored messages:", error);
    }
    console.log("No stored messages found, returning empty array");
    return [];
  };

  /**
   * Handles starting the practice session.
   * 点击练习说明页的 GO 后，进入正式练习阶段
   */
  const handleStartPractice = () => {
    setCurrentStage(STAGES.PRACTICE);
    safeSetLocalStorage("currentStage", STAGES.PRACTICE);
    safeSetLocalStorage("currentIndex", 0); // Set to first practice character (Harry)
    setCurrentIndex(0);
  };

  /**
   * Handles starting the main study.
   */
  const handleStartMainStudy = () => {
    // Generate random order for main study characters if not already done
    const newRandomOrder = randomOrder || generateRandomOrder();
    
    // Get the first character index from the random order
    const firstIndex = newRandomOrder[0];
    
    // Update all state in a specific sequence to ensure synchronization
    setRandomOrder(newRandomOrder);
    setOrderPosition(0);
    setCurrentIndex(firstIndex);  // Set the character index first
    setCurrentStage(STAGES.MAIN_STUDY);
    
    // Then update localStorage
    safeSetLocalStorage("randomOrder", JSON.stringify(newRandomOrder));
    safeSetLocalStorage("orderPosition", 0);
    safeSetLocalStorage("currentIndex", firstIndex);
    safeSetLocalStorage("currentStage", STAGES.MAIN_STUDY);
    
    // Reset state to ensure clean transition
    resetState();
  };

  /**
   * 【修改】处理欢迎页面“GO”按钮点击：
   * 确保 userID 已生成，将当前阶段设置为 PRACTICE_INSTRUCTION，
   * 并跳转到第一个Qualtrics问卷
   */
  const handleWelcomeGo = () => {
    let userID = localStorage.getItem("userID");
    if (!userID) {
      userID = generateUserID();
      safeSetLocalStorage("userID", userID);
    }

    // 设置阶段为 PRACTICE_INSTRUCTION，返回时显示练习说明
    // setCurrentStage(STAGES.PRACTICE_INSTRUCTION);
    safeSetLocalStorage("currentStage", STAGES.PRACTICE_INSTRUCTION);
    
    const params = new URLSearchParams({ userID });
    window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_9tMsWXBYiktt7uK?${params.toString()}`;


  };



    /**
   * 处理Next/Questionnaire按钮动作
   */
  const handleNextOrQuestionnaire = async () => {
    // 获取当前角色的最新消息
    const currentMessages = getStoredMessages();
    
    // 检查用户是否有足够的交互（至少2条用户消息）
    const userInteractions = currentMessages.filter(msg => msg.sender === "user").length;
    console.log(`当前用户交互次数: ${userInteractions}`);
    
    // 练习模式处理逻辑
    if (currentStage === STAGES.PRACTICE) {
      if (userInteractions >= 1 || true) {
        try {
          // 添加CSV上传逻辑，与MAIN_STUDY阶段类似
          const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
          const filename = `practiceHistory_${timestamp}.csv`;
          const csvData = convertMessagesToCSV(currentMessages);
          const response = await uploadData(filename, csvData);
          
          if (response.ok) {
            console.log(`练习聊天记录成功上传为 ${filename}`);
          } else {
            console.error("上传练习聊天记录失败:", response.statusText);
          }
          
          // 重置状态并继续到下一个练习角色或练习完成阶段
          if (currentIndex === 0) {
            resetState();
            safeSetLocalStorage("currentIndex", 1);
            setCurrentIndex(1);
          } else if (currentIndex === 1) {
            resetState();
            setCurrentStage(STAGES.PRACTICE_COMPLETE);
            safeSetLocalStorage("currentStage", STAGES.PRACTICE_COMPLETE);
          }
        } catch (error) {
          console.error("练习阶段处理过程中出错:", error);
        }
      } else {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2000);
      }
      return;
    }
    
    // MainStudy阶段处理
    if (currentStage === STAGES.MAIN_STUDY) {
      if (userInteractions >= 5) {
        try {
          // 上传聊天记录逻辑保持不变
          const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
          const filename = `chatHistory_${timestamp}.csv`;
          const csvData = convertMessagesToCSV(currentMessages);
          const response = await uploadData(filename, csvData);
          
          if (response.ok) {
            console.log(`聊天记录成功上传为 ${filename}`);
          } else {
            console.error("上传聊天记录失败:", response.statusText);
          }
    
          // 获取用户ID和参数
          const userID = localStorage.getItem("userID");
          const params = new URLSearchParams({
            userID,
            design_conduct: CHARACTER_CONDUCT[currentIndex],
            design_neurodiversity: CHARACTER_NEURODIVERSITY[currentIndex]
          });
    
          // 关键修改: 彻底清除所有消息数据
          clearAllMessageData();
          
          // 更新角色位置
          const newPosition = orderPosition + 1;
          
          // 检查是否完成所有角色
          if (newPosition < randomOrder.length) {
            // 继续下一个NPC
            setOrderPosition(newPosition);
            safeSetLocalStorage("orderPosition", newPosition);
            const nextIndex = randomOrder[newPosition];
            safeSetLocalStorage("currentIndex", nextIndex);
            setCurrentIndex(nextIndex);
            
            // 重定向到问卷前，确保localStorage中的messages已被清除
            localStorage.removeItem("messages");
            
            // 跳转到问卷
            window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_1EWpZcb7kNte62y?${params.toString()}`;
          } else {
            // 完成所有NPC，进入AI准备阶段
            safeSetLocalStorage("currentStage", STAGES.AI_READINESS);
            
            // 重定向到此角色的最终问卷前，确保localStorage中的messages已被清除
            localStorage.removeItem("messages");
            
            // 跳转到问卷
            window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_1EWpZcb7kNte62y?${params.toString()}`;
            
            // 重置位置
            setOrderPosition(0);
            safeSetLocalStorage("orderPosition", 0);
            const firstIndex = randomOrder[0];
            safeSetLocalStorage("currentIndex", firstIndex);
            setCurrentIndex(firstIndex);
          }
        } catch (error) {
          console.error("问卷处理过程中出错:", error);
        }
      } else {
        // 如果交互不足，显示警告
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2000);
      }
    }
  };
  // /**
  //  * 处理Next/Questionnaire按钮动作
  //  */
  // const handleNextOrQuestionnaire = async () => {
  //   // 获取当前角色的最新消息
  //   const currentMessages = getStoredMessages();
    
  //   // 检查用户是否有足够的交互（至少2条用户消息）
  //   const userInteractions = currentMessages.filter(msg => msg.sender === "user").length;
  //   console.log(`当前用户交互次数: ${userInteractions}`);
    
  //   // 练习模式处理逻辑
  //   if (currentStage === STAGES.PRACTICE) {
  //     // 练习阶段代码保持不变...
  //     if (userInteractions >= 1 || true) {
  //       if (currentIndex === 0) {
  //         resetState();
  //         safeSetLocalStorage("currentIndex", 1);
  //         setCurrentIndex(1);
  //       } else if (currentIndex === 1) {
  //         resetState();
  //         setCurrentStage(STAGES.PRACTICE_COMPLETE);
  //         safeSetLocalStorage("currentStage", STAGES.PRACTICE_COMPLETE);
  //       }
  //     } else {
  //       setShowWarning(true);
  //       setTimeout(() => setShowWarning(false), 2000);
  //     }
  //     return;
  //   }
    
  //   // MainStudy阶段处理
  //   if (currentStage === STAGES.MAIN_STUDY) {
  //     if (userInteractions >= 5) {
  //       try {
  //         // 上传聊天记录逻辑保持不变
  //         const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
  //         const filename = `chatHistory_${timestamp}.csv`;
  //         const csvData = convertMessagesToCSV(currentMessages);
  //         const response = await uploadData(filename, csvData);
          
  //         if (response.ok) {
  //           console.log(`聊天记录成功上传为 ${filename}`);
  //         } else {
  //           console.error("上传聊天记录失败:", response.statusText);
  //         }
    
  //         // 获取用户ID和参数
  //         const userID = localStorage.getItem("userID");
  //         const params = new URLSearchParams({
  //           userID,
  //           design_conduct: CHARACTER_CONDUCT[currentIndex],
  //           design_neurodiversity: CHARACTER_NEURODIVERSITY[currentIndex]
  //         });
    
  //         // 关键修改: 彻底清除所有消息数据
  //         clearAllMessageData();
          
  //         // 更新角色位置
  //         const newPosition = orderPosition + 1;
          
  //         // 检查是否完成所有角色
  //         if (newPosition < randomOrder.length) {
  //           // 继续下一个NPC
  //           setOrderPosition(newPosition);
  //           safeSetLocalStorage("orderPosition", newPosition);
  //           const nextIndex = randomOrder[newPosition];
  //           safeSetLocalStorage("currentIndex", nextIndex);
  //           setCurrentIndex(nextIndex);
            
  //           // 重定向到问卷前，确保localStorage中的messages已被清除
  //           localStorage.removeItem("messages");
            
  //           // 跳转到问卷
  //           window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_1EWpZcb7kNte62y?${params.toString()}`;
  //         } else {
  //           // 完成所有NPC，进入AI准备阶段
  //           safeSetLocalStorage("currentStage", STAGES.AI_READINESS);
            
  //           // 重定向到此角色的最终问卷前，确保localStorage中的messages已被清除
  //           localStorage.removeItem("messages");
            
  //           // 跳转到问卷
  //           window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_1EWpZcb7kNte62y?${params.toString()}`;
            
  //           // 重置位置
  //           setOrderPosition(0);
  //           safeSetLocalStorage("orderPosition", 0);
  //           const firstIndex = randomOrder[0];
  //           safeSetLocalStorage("currentIndex", firstIndex);
  //           setCurrentIndex(firstIndex);
  //         }
  //       } catch (error) {
  //         console.error("问卷处理过程中出错:", error);
  //       }
  //     } else {
  //       // 如果交互不足，显示警告
  //       setShowWarning(true);
  //       setTimeout(() => setShowWarning(false), 2000);
  //     }
  //   }
  // };

  // 修改一个守卫函数，确保在页面加载/返回时也清除消息
  const ensureCleanState = () => {
    // 检查当前阶段
    const currentStage = getSavedStage();
    
    // 如果从问卷返回到MAIN_STUDY阶段，确保消息被清除
    if (currentStage === STAGES.MAIN_STUDY) {
      // 尝试检查是否刚从问卷返回（可以通过referrer或时间戳等方式）
      const timestamp = new Date().getTime();
      const lastRedirect = localStorage.getItem("lastRedirectTime") || 0;
      
      // 如果刚刚返回（30秒内）
      if (timestamp - lastRedirect < 30000) {
        console.log("检测到从问卷返回，清除所有消息");
        clearAllMessageData();
      }
      
      // 无论如何，更新此时间戳
      safeSetLocalStorage("lastRedirectTime", timestamp);
    }
  };

  // const handleAISurvey = () => {
  //   const userID = localStorage.getItem("userID");
  //   const params = new URLSearchParams({ userID });
  //   window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_ePcYyuNH4Esjnmu?${params.toString()}`;
  // };

  // 3. 修改handleAISurvey函数
  const handleAISurvey = () => {
    // 生成并保存随机代码
    const completionCode = generateRandomCode();
    safeSetLocalStorage("completionCode", completionCode);
    
    // 设置下一个阶段为FINAL_CODE
    // setCurrentStage(STAGES.FINAL_CODE);
    safeSetLocalStorage("currentStage", STAGES.FINAL_CODE);

    // 跳转问卷
    const userID = localStorage.getItem("userID");
    const params = new URLSearchParams({ userID });
    window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_ePcYyuNH4Esjnmu?${params.toString()}`;
  };

  // // 初始化：确保正确的角色和随机序列加载
  // useEffect(() => {
  //   const savedIndex = getSavedIndex();
  //   const savedStage = getSavedStage();
  //   const savedRandomOrder = getSavedRandomOrder();
  //   const savedOrderPosition = getSavedOrderPosition();
    
  //   if (savedStage === STAGES.INTRO) {
  //     let uid = localStorage.getItem("userID");
  //     if (!uid) {
  //       uid = generateUserID();
  //       safeSetLocalStorage("userID", uid);
  //     }
  //   }
    
  //   if (!randomOrder || randomOrder.length === 0) {
  //     setRandomOrder(savedRandomOrder);
  //     safeSetLocalStorage("randomOrder", JSON.stringify(savedRandomOrder));
  //   }
    
  //   if (orderPosition !== savedOrderPosition) {
  //     setOrderPosition(savedOrderPosition);
  //   }
    
  //   if (savedIndex !== currentIndex || savedStage !== currentStage) {
  //     setCurrentIndex(savedIndex);
  //     setCurrentStage(savedStage);
  //     resetState();
  //   }
  // }, []);
// Modify useEffect to ensure we clear messages on first load if needed
// 在useEffect中调用确保清洁状态的函数
useEffect(() => {
  // From localStorage read all persistent data
  const savedIndex = getSavedIndex();
  const savedStage = getSavedStage();
  const savedRandomOrder = getSavedRandomOrder();
  const savedOrderPosition = getSavedOrderPosition();
  
  // Ensure userID exists (needed for all stages)
  let uid = localStorage.getItem("userID");
  if (!uid) {
    uid = generateUserID();
    safeSetLocalStorage("userID", uid);
  }
  
  // Force synchronize key states
  setRandomOrder(prev => {
    // Only set random order when uninitialized
    if (prev.length === 0) return savedRandomOrder;
    return prev;
  });
      
  setOrderPosition(savedOrderPosition);
      
  // Important: Set the currentIndex before setting currentStage
  setCurrentIndex(savedIndex);
  setCurrentStage(savedStage);
   
  // Reset state if stage/index has changed
  if (savedIndex !== currentIndex || savedStage !== currentStage) {
    // Force clear any cached messages
    setMessages([]);
    resetState();
  }
  
  // Ensure localStorage stores the latest random order (if not stored previously)
  if (savedRandomOrder && savedRandomOrder.length > 0) {
    safeSetLocalStorage("randomOrder", JSON.stringify(savedRandomOrder));
  }
  
  // 确保清洁状态
  ensureCleanState();
  
  // 如果跳转问卷前，记录时间戳
  window.addEventListener("beforeunload", () => {
    const timestamp = new Date().getTime();
    safeSetLocalStorage("lastRedirectTime", timestamp);
  });
  
  return () => {
    window.removeEventListener("beforeunload", () => {});
  };
}, [currentIndex, currentStage]); // 添加依赖项以正确跟踪变化
  // Initialize Convai client with current character
  const { client } = useConvaiClient(
    CHARACTER_IDS[currentIndex],
    "00728a1475eba58eb62542c313d667f0"
  );

  /**
   * Handles new messages from the chat component
   */
  const handleNewMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
    if (msg.sender === "user") {
      setShowInteractionCue(false);
    }
  };

  // 新增：当阶段为 PRACTICE_INSTRUCTION 时，显示练习说明板
  if (currentStage === STAGES.PRACTICE_INSTRUCTION) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: "20px",
          padding: "40px",
          width: "70%",
          maxWidth: "1200px",
          color: "white",
          textAlign: "center"
        }}>
          {/* <h2 style={{ marginBottom: "40px", fontSize: "36px" }}>Practice Instructions</h2> */}
          <p style={{ fontSize: "24px", marginBottom: "16px" ,fontWeight: "bold" }}>
            Next you will now be entering the PRACTICE SESSIONS.
          </p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>
            There will be 2 consecutive practice sessions with an AI NPC.
          </p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>
            Your task is to interact with them and get acquainted with the interaction experience.
          </p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>
            You will be provided with a set of interaction cues in each session.
          </p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>Please click on NEXT below when you are ready to begin.</p>
          <div 
            onClick={handleStartPractice}
            style={{
              backgroundColor: "rgba(50, 50, 50, 0.7)",
              borderRadius: "20px",
              width: "200px",
              height: "80px",
              margin: "40px auto 0",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "24px"
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
          >
            NEXT
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === STAGES.INTRO) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: "20px",
          padding: "40px",
          width: "70%",
          maxWidth: "1200px",
          color: "white",
          textAlign: "center"
        }}>
          {/* <h2 style={{ marginBottom: "40px", fontSize: "16px" }}>Welcome to the Human Factors Evaluation of Gen-AI based NPC Interactions in Public Safety Training!</h2> */}
          <p style={{ marginBottom: "16px", fontSize: "24px", fontWeight: "bold" }}>
            Welcome to the Human Factors Evaluation of Gen-AI based NPC Interactions in Public Safety Training!
          </p>
          <p style={{ fontSize: "24px", marginBottom: "16px" }}>In this study, you will interact with Gen-AI based non-playable characters.</p>
          <p style={{ fontSize: "24px", marginBottom: "16px" }}>You will ask them a series of questions as prompted.</p>
          <p style={{ fontSize: "24px", marginBottom: "16px" }}>Before you begin the tasks, we will first ask you to fill two surveys.</p>
          <p style={{ fontSize: "24px", marginBottom: "16px" }}>Please click on BEGIN STUDY below when you are ready to begin.</p>
          <div 
            onClick={handleWelcomeGo}
            style={{
              backgroundColor: "rgba(50, 50, 50, 0.7)",
              borderRadius: "20px",
              width: "200px",
              height: "80px",
              margin: "40px auto 0",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "24px"
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
          >
            BEGIN STUDY
          </div>
        </div>
      </div>
    );
  }
  
  // if (currentStage === STAGES.PRACTICE_COMPLETE) {
  //   return (
  //     <div style={{
  //       position: "fixed",
  //       top: 0,
  //       left: 0,
  //       width: "100%",
  //       height: "100%",
  //       backgroundColor: "rgba(0, 0, 0, 0.8)",
  //       display: "flex",
  //       justifyContent: "center",
  //       alignItems: "center",
  //       zIndex: 9999
  //     }}>
  //       <div style={{
  //         backgroundColor: "rgba(0, 0, 0, 0.7)",
  //         borderRadius: "20px",
  //         padding: "40px",
  //         width: "100%",
  //         maxWidth: "1400px",
  //         color: "white",
  //         textAlign: "center",
  //         fontSize: "25px"
  //       }}>
  //         {/* <h2 style={{ marginBottom: "40px" }}>Practice Complete!</h2>  */}
  //         <p style={{ fontSize: "24px", marginBottom: "16px" }}>Thank you for completing the practice sessions.</p>
  //         <p style={{ fontSize: "24px", marginBottom: "16px" }}>You will now begin the actual study sessions.</p>
  //         <p style={{ fontSize: "24px", marginBottom: "16px" }}></p>
  //         <p style={{ fontSize: "24px", marginBottom: "16px", fontWeight: "bold" }}>PLEASE PAY ATTENTION TO THE FOLLOWING INSTRUCTIONS:</p>
  //         <p style={{ fontSize: "24px", marginBottom: "16px" }}>Please click on BEGIN STUDY below when you are ready to begin.</p>
  //         <p style={{ fontSize: "24px", marginBottom: "16px" }}>There will be 16 consecutive sessions with an AI NPC.</p>
  //         <p style={{ fontSize: "24px", marginBottom: "16px" }}>Please click on NEXT below when you are ready to begin.</p>
  //         <div 
  //           onClick={handleStartMainStudy}
  //           style={{
  //             backgroundColor: "rgba(50, 50, 50, 0.7)",
  //             borderRadius: "20px",
  //             width: "200px",
  //             height: "80px",
  //             margin: "40px auto 0",
  //             color: "white",
  //             display: "flex",
  //             justifyContent: "center",
  //             alignItems: "center",
  //             cursor: "pointer",
  //             fontWeight: "bold"
  //           }}
  //           onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
  //           onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
  //         >
  //           NEXT
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }
  if (currentStage === STAGES.PRACTICE_COMPLETE) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: "20px",
          padding: "40px",
          width: "100%",
          maxWidth: "1400px",
          color: "white",
          textAlign: "center",
          fontSize: "25px"
        }}>
          {/* <h2 style={{ marginBottom: "40px" }}>Practice Complete!</h2>  */}
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>Thank you for completing the practice sessions.</p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>You will now begin the actual study sessions.</p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>&nbsp;</p>
          <p style={{ fontSize: "20px", marginBottom: "16px", fontWeight: "bold" }}>PLEASE PAY ATTENTION TO THE FOLLOWING INSTRUCTIONS:</p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>You will now have 16 consecutive sessions with an AI NPC.</p>
          <p style={{ fontSize: "20px", marginBottom: "16px", fontWeight: "bold" }}>In each session, you are a police officer responding to a situation with a person in crisis.</p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>Each situation is different.</p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>Your goal is to obtain an initial assessment of the situation by following the prompt provided to you.</p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>After each session you will be asked to fill a survey based on your interaction experience.</p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>&nbsp;</p>
          <p style={{ fontSize: "20px", marginBottom: "16px" }}>Please click on NEXT below when you have read the instructions above and are ready to begin.</p>
          <div
            onClick={handleStartMainStudy}
            style={{
              backgroundColor: "rgba(50, 50, 50, 0.7)",
              borderRadius: "20px",
              width: "200px",
              height: "80px",
              margin: "40px auto 0",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
          >
            NEXT
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === STAGES.AI_READINESS) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: "20px",
          padding: "40px",
          width: "70%",
          maxWidth: "1200px",
          color: "white",
          textAlign: "center"
        }}>
          {/* <h2 style={{ marginBottom: "40px", fontSize: "36px" }}></h2>
           */}
          <p style={{ fontSize: "24px", marginBottom: "16px" }}>Thank you for completing the study trials.</p>
          <p style={{ fontSize: "24px", marginBottom: "16px", fontWeight:"bold" }}>We are almost done!</p>
          <p style={{ fontSize: "24px", marginBottom: "16px" }}>Next you will answer few end-of-study surveys.</p>
          <p style={{ fontSize: "24px", marginBottom: "16px" }}>Please click on NEXT below when you are ready to begin.</p>
          <div 
            onClick={handleAISurvey}
            style={{
              backgroundColor: "rgba(50, 50, 50, 0.7)",
              borderRadius: "20px",
              width: "200px",
              height: "80px",
              margin: "40px auto 0",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "24px"
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
          >
            NEXT
          </div>
        </div>
      </div>
    );
  }

  if (currentStage === STAGES.FINAL_CODE) {
    const completionCode = localStorage.getItem("completionCode") || "XXXXXX";
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: "20px",
          padding: "40px",
          width: "70%",
          maxWidth: "1200px",
          color: "white",
          textAlign: "center"
        }}>
          <h2 style={{ marginBottom: "40px", fontSize: "36px", fontWeight:"bold" }}>Thank you for completing the study!</h2>
          <p style={{ fontSize: "24px", marginBottom: "20px" }}>
            Now you are done! 
          </p>
          <p style={{ fontSize: "24px", marginBottom: "20px" }}>
            Please insert this completion code to the mTurk study page: 
          </p>
          <div style={{ 
            fontSize: "48px", 
            fontWeight: "bold",
            letterSpacing: "8px",
            margin: "40px 0",
            color: "#00ff00"
          }}>
            {completionCode}
          </div>
          <p style={{ fontSize: "24px", marginBottom: "20px" }}>
            This code is not resuable. 
          </p>
          <div 
            onClick={() => window.close()} // 或跳转到指定URL
            style={{
              backgroundColor: "rgba(50, 50, 50, 0.7)",
              borderRadius: "20px",
              width: "200px",
              height: "80px",
              margin: "40px auto 0",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "24px"
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
          >
            FINISH
          </div>
        </div>
      </div>
    );
  }
  
  if (currentStage === STAGES.PRACTICE) {
    const completionCode = localStorage.getItem("completionCode") || "XXXXXX";
 // For practice or main study stages, render the main app UI
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            borderRadius: "10px",
            width: "8vw",
            height: "2.5vw",
            color: "white",
            display: "flex",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 1000,
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 1)")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 0.7)")}
          onClick={handleNextOrQuestionnaire}
        >
          <div
            style={{
              alignSelf: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            <p style={{ fontSize: "1vw" }}>
              {currentStage === STAGES.PRACTICE ? "Next" : "Questionnaire"}
            </p>
          </div>
        </div>

       {showInteractionCue && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "5px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            borderRadius: "20px",
            width: "35vw",
            height: "60vh",
            color: "white",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start", // 改为从顶部开始
            alignItems: "center",
            padding: "15px", // 增加内边距
            overflow: "auto" // 添加滚动条以防内容超出
          }}
        >
          <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: "1.2vw", marginBottom: "5px"}}>Press [T] to talk to the NPC, and release [T] after following each prompt below.</p>
              <p style={{ fontSize: "1.2vw", marginBottom: "5px" }}>Please wait until the NPC finishes responding before following the next prompt.</p>
              <p style={{ fontSize: "1.2vw", marginBottom: "5px", fontWeight: "bold" }}>Prompts:</p>
            <ol style={{ fontSize: "1.2vw", margin: "5px", textAlign: "left" }}>
              {/* <li>Press [T] to talk to the NPC, and release [T] when you have followed each instruction below:</li> */}
              <li>Introduce yourself to the NPC and greet them.</li>
              <li>Ask for their name.</li>
              <li>Ask them about their favorite game.</li>
              <li>Ask them about an amazing fact they know.</li>
            </ol>
          </div>
          {/* 修改此处的 marginTop 值或删除 */}
          <div style={{ marginTop: "5px" }}>
            <p style={{ textAlign: "center" }}></p>
          </div>
        </div>
      )}

        {showWarning && (
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(255,0,0,0.9)",
            color: "white",
            padding: "40px",
            borderRadius: "16px",
            zIndex: 9999,
            fontSize: "2em"
          }}>
            Minimum 5 interactions required!
          </div>
        )}

        <KeyboardControls
          map={[
            { name: "forward", keys: ["ArrowUp", "w", "W"] },
            { name: "backward", keys: ["ArrowDown", "s", "S"] },
            { name: "left", keys: ["ArrowLeft", "a", "A"] },
            { name: "right", keys: ["ArrowRight", "d", "D"] },
            { name: "sprint", keys: ["Shift"] },
            { name: "jump", keys: ["Space"] },
          ]}
        >
          <Loader />
          <Canvas
            shadows
            camera={{
              position: [0, 0.8, 3],
              fov: 75,
            }}
            key={CHARACTER_IDS[currentIndex]} // Force canvas re-creation on character change
          >
            <Experience client={client} model={CHARACTER_MODELS[currentIndex]} />
          </Canvas>
        </KeyboardControls>
        <ChatBubble
          client={client}
          llmModel={CHARACTER_LLM[currentIndex]}
          llmConduct={CHARACTER_CONDUCT[currentIndex]}
          llmNeuro={CHARACTER_NEURODIVERSITY[currentIndex]}
          onNewMessage={handleNewMessage}
        />
      </>
    );
  }

  if (currentStage === STAGES.MAIN_STUDY) {
    const completionCode = localStorage.getItem("completionCode") || "XXXXXX";
 // For practice or main study stages, render the main app UI
    return (
      <>
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            borderRadius: "10px",
            width: "8vw",
            height: "2.5vw",
            color: "white",
            display: "flex",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 1000,
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 1)")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 0.7)")}
          onClick={handleNextOrQuestionnaire}
        >
          <div
            style={{
              alignSelf: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            <p style={{ fontSize: "1vw" }}>
              {currentStage === STAGES.PRACTICE ? "Next" : "Questionnaire"}
            </p>
          </div>
        </div>

        {showInteractionCue && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "15px",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              borderRadius: "20px",
              width: "30vw",
              height: "55vh",
              color: "white",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "10px"
            }}
          >
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: "1vw", marginBottom: "5px"}}>Press [T] to talk to the NPC, and release [T] after asking each question below.</p>
              <p style={{ fontSize: "1vw", marginBottom: "5px" }}>Please wait until the NPC finishes responding before asking the next question.</p>
              <p style={{ fontSize: "1vw", marginBottom: "5px", fontWeight: "bold" }}>Questions:</p>
              <ol style={{ fontSize: "1vw", margin: "5px", textAlign: "left" }}>
                {/* <li>Press [T] to talk to the NPC, and release [T] when you have followed each instruction below: </li> */}
                <li>What is your name?</li>
                <p></p>
                <li>Do you feel safe right now?</li>
                <p></p>
                <li>Are you thinking of hurting yourself or others?</li>
                <p></p>
                <li>What would help you feel calmer?</li>
                <p></p>
                <li>What are you feeling physically and emotionally right now?</li>
              </ol>
              <p style={{ fontSize: "1vw", marginBottom: "5px"}}>After asking the above questions, please click on the [Questionnaire] at the top right of the webpage.</p>
            </div>
            <div style={{ marginTop: "20px" }}>
              <p style={{ textAlign: "center" }}></p>
            </div>
          </div>
        )}

        {showWarning && (
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(255,0,0,0.9)",
            color: "white",
            padding: "40px",
            borderRadius: "16px",
            zIndex: 9999,
            fontSize: "2em"
          }}>
            Minimum 5 interactions required!
          </div>
        )}

        <KeyboardControls
          map={[
            { name: "forward", keys: ["ArrowUp", "w", "W"] },
            { name: "backward", keys: ["ArrowDown", "s", "S"] },
            { name: "left", keys: ["ArrowLeft", "a", "A"] },
            { name: "right", keys: ["ArrowRight", "d", "D"] },
            { name: "sprint", keys: ["Shift"] },
            { name: "jump", keys: ["Space"] },
          ]}
        >
          <Loader />
          <Canvas
            shadows
            camera={{
              position: [0, 0.8, 3],
              fov: 75,
            }}
            key={CHARACTER_IDS[currentIndex]} // Force canvas re-creation on character change
          >
            <Experience client={client} model={CHARACTER_MODELS[currentIndex]} />
          </Canvas>
        </KeyboardControls>
        <ChatBubble
          client={client}
          llmModel={CHARACTER_LLM[currentIndex]}
          llmConduct={CHARACTER_CONDUCT[currentIndex]}
          llmNeuro={CHARACTER_NEURODIVERSITY[currentIndex]}
          onNewMessage={handleNewMessage}
        />
      </>
    );
  }
}

export default App;


// import { Canvas } from "@react-three/fiber";
// import { Experience } from "./components/Experience";
// import { KeyboardControls, Loader } from "@react-three/drei";
// import { useConvaiClient } from "./hooks/useConvaiClient";
// import ChatBubble from "./components/chat/Chat";
// import { useState, useEffect } from "react";
// import { uploadData } from "./helpers/datapipeAPI";

// // Updated character arrays with practice characters (Harry and James) at the beginning
// const CHARACTER_IDS = [
//   // Practice characters
//   "8e14f716-656c-11ef-9d91-42010a7be011", // Harry
//   "bc5688ec-656c-11ef-b1a4-42010a7be011", // James
//   // Main study characters
//   "818d2b6e-6619-11ef-8904-42010a7be011", // Antoiane
//   "a884e968-661a-11ef-93da-42010a7be011", // Ashline
//   "89cc6766-661b-11ef-85d8-42010a7be011", // Charleen
//   "b75d8c36-6626-11ef-ab22-42010a7be011", // Jax
//   "ea1c4d1e-6627-11ef-93da-42010a7be011", // Jessie
//   "a4dff092-64a7-11ef-a91e-42010a7be011", // Alfred
//   "b75d8c36-6626-11ef-ab22-42010a7be011", // Amber
//   "7e114f7a-661d-11ef-ab22-42010a7be011", // Charlene
//   "850067ac-63b2-11ef-be21-42010a7be011", // David
//   "8dc2e6c6-661e-11ef-8a10-42010a7be011", // Devon
//   "7625aa3e-661f-11ef-864f-42010a7be011", // Disire
//   "6d227976-6624-11ef-8904-42010a7be011", // India
//   "e841ed80-6624-11ef-93da-42010a7be011", // Issac
//   "26aa1774-6629-11ef-a179-42010a7be011", // Matthew
//   "2cb1c924-662d-11ef-8a10-42010a7be011", // Ronald
//   "a8a061d4-662e-11ef-ab87-42010a7be011", // Sadie
// ];

// const CHARACTER_LLM = ["LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1", "LLM1"];
// const CHARACTER_CONDUCT = ["C", "C", "C", "C", "NC", "NC", "NC", "NC", "C", "NC", "C", "NC", "NC", "C", "C", "C", "NC", "C"];
// const CHARACTER_NEURODIVERSITY = ["NT", "NT", "NT", "ND", "ND", "NT", "NT", "ND", "ND", "ND", "ND", "ND", "NT", "NT", "NT", "ND", "NT", "NT"];
// const CHARACTER_MODELS = ["Harry", "James", "Antoiane", "Ashline", "Charleen", "Jax", "Jessie", "Alfred", "Amber", "Charlene", "David", "Devon", "Disire", "India", "Issac", "Matthew", "Ronald", "Sadie"];

// // Workflow stages
// const STAGES = {
//   INTRO: "intro",
//   PRACTICE: "practice",
//   PRACTICE_COMPLETE: "practiceComplete",
//   MAIN_STUDY: "mainStudy"
// };

// /**
//  * Generates a random order for main study characters (indexes 2-17)
//  */
// const generateRandomOrder = () => {
//   // Create array of indices from 2 to 17 (16 main study characters)
//   const indices = Array.from({ length: 16 }, (_, i) => i + 2);
  
//   // Fisher-Yates shuffle algorithm
//   for (let i = indices.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [indices[i], indices[j]] = [indices[j], indices[i]];
//   }
  
//   return indices;
// };

// /**
//  * Retrieves the saved character index from localStorage safely.
//  */
// const getSavedIndex = () => {
//   if (typeof window !== "undefined") {
//     try {
//       const saved = localStorage.getItem("currentIndex");
//       return saved ? parseInt(saved, 10) : 0;
//     } catch (error) {
//       console.error("Failed to read from localStorage:", error);
//       return 0;
//     }
//   }
//   return 0;
// };

// /**
//  * Retrieves the saved workflow stage from localStorage safely.
//  */
// const getSavedStage = () => {
//   if (typeof window !== "undefined") {
//     try {
//       const saved = localStorage.getItem("currentStage");
//       return saved || STAGES.INTRO;
//     } catch (error) {
//       console.error("Failed to read stage from localStorage:", error);
//       return STAGES.INTRO;
//     }
//   }
//   return STAGES.INTRO;
// };

// /**
//  * Retrieves the random order array from localStorage, or generates a new one
//  */
// const getSavedRandomOrder = () => {
//   if (typeof window !== "undefined") {
//     try {
//       const saved = localStorage.getItem("randomOrder");
//       if (saved) {
//         return JSON.parse(saved);
//       }
//     } catch (error) {
//       console.error("Failed to read randomOrder from localStorage:", error);
//     }
//   }
//   return generateRandomOrder();
// };

// /**
//  * Gets the current position in the random order sequence
//  */
// const getSavedOrderPosition = () => {
//   if (typeof window !== "undefined") {
//     try {
//       const saved = localStorage.getItem("orderPosition");
//       return saved ? parseInt(saved, 10) : 0;
//     } catch (error) {
//       console.error("Failed to read orderPosition from localStorage:", error);
//       return 0;
//     }
//   }
//   return 0;
// };

// function App() {
//   const [currentIndex, setCurrentIndex] = useState(getSavedIndex);
//   const [currentStage, setCurrentStage] = useState(getSavedStage);
//   const [randomOrder, setRandomOrder] = useState(getSavedRandomOrder);
//   const [orderPosition, setOrderPosition] = useState(getSavedOrderPosition);
//   const [showWarning, setShowWarning] = useState(false);
//   const [messages, setMessages] = useState([]);
//   const [showInteractionCue, setShowInteractionCue] = useState(true);

//   /**
//    * Stores values in localStorage safely.
//    */
//   const safeSetLocalStorage = (key, value) => {
//     if (typeof window !== "undefined") {
//       try {
//         localStorage.setItem(key, value);
//       } catch (error) {
//         console.warn("Failed to write to localStorage:", error);
//       }
//     }
//   };

//   /**
//    * Converts messages array to CSV format with all required fields
//    * @param {Array} messages - Array of message objects
//    * @returns {String} CSV formatted string
//    */
//   const convertMessagesToCSV = (messages) => {
//     const csvRows = ["timestamp,speaker,model,conduct,neurodiversity,content"]; // CSV Header without extra spaces and commas
//     messages.forEach(({ sender, content, timestamp, llmModel, llmConduct, llmNeuro }) => {
//       csvRows.push(`"${timestamp}","${sender}","${llmModel}","${llmConduct}","${llmNeuro}","${content.replace(/"/g, '""')}"`);
//     });
//     return csvRows.join("\n");
//   };

//   /**
//    * Resets the chat state when switching characters
//    */
//   const resetState = () => {
//     setMessages([]);
//     if (client?.convaiClient?.current) {
//       client.convaiClient.current.resetSession();
//     }
//     client?.setUserText("");
//     client?.setNpcText("");
    
//     // Clear the character's chat history in localStorage
//     const characterId = CHARACTER_IDS[currentIndex];
//     try {
//       const storedData = localStorage.getItem("messages");
//       if (storedData) {
//         const parsedData = JSON.parse(storedData);
//         if (parsedData[characterId]) {
//           parsedData[characterId] = {
//             sessionID: -1,
//             message: [],
//           };
//           localStorage.setItem("messages", JSON.stringify(parsedData));
//         }
//       }
//     } catch (error) {
//       console.error("Failed to reset localStorage:", error);
//     }
    
//     // Reset and show interaction cue when switching characters
//     setShowInteractionCue(true);
//   };

//   /**
//    * Generates a unique user ID for the questionnaire
//    * @returns {String} Unique identifier
//    */
//   const generateUserID = () => {
//     return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
//   };

//   /**
//    * Gets the current chat history from localStorage
//    * @returns {Array} Array of message objects
//    */
//   const getStoredMessages = () => {
//     try {
//       const characterId = CHARACTER_IDS[currentIndex];
//       const storedData = localStorage.getItem("messages");
      
//       if (storedData) {
//         const parsedData = JSON.parse(storedData);
//         if (parsedData[characterId] && Array.isArray(parsedData[characterId].message)) {
//           return parsedData[characterId].message;
//         }
//       }
//     } catch (error) {
//       console.error("Failed to get stored messages:", error);
//     }
//     return [];
//   };

//   /**
//    * Handles starting the practice session
//    */
//   const handleStartPractice = () => {
//     setCurrentStage(STAGES.PRACTICE);
//     safeSetLocalStorage("currentStage", STAGES.PRACTICE);
//     safeSetLocalStorage("currentIndex", 0); // Set to first practice character (Harry)
//     setCurrentIndex(0);
//   };

//   // /**
//   //  * Handles starting the main study
//   //  */
//   // const handleStartMainStudy = () => {
//   //   // Generate random order for main study characters if not already done
//   //   const newRandomOrder = randomOrder || generateRandomOrder();
//   //   setRandomOrder(newRandomOrder);
//   //   safeSetLocalStorage("randomOrder", JSON.stringify(newRandomOrder));
//   //   safeSetLocalStorage("orderPosition", 0);
//   //   setOrderPosition(0);
    
//   //   setCurrentStage(STAGES.MAIN_STUDY);
//   //   safeSetLocalStorage("currentStage", STAGES.MAIN_STUDY);
    
//   //   // Start with the first character in the random order
//   //   const firstIndex = newRandomOrder[0];
//   //   safeSetLocalStorage("currentIndex", firstIndex);
//   //   setCurrentIndex(firstIndex);
//   // };
//   /**
//  * Handles starting the main study
//  */
//   const handleStartMainStudy = () => {
//     // Generate random order for main study characters if not already done
//     const newRandomOrder = randomOrder || generateRandomOrder();
    
//     // Get the first character index from the random order
//     const firstIndex = newRandomOrder[0];
    
//     // Update all state in a specific sequence to ensure synchronization
//     setRandomOrder(newRandomOrder);
//     setOrderPosition(0);
//     setCurrentIndex(firstIndex);  // Set the character index first
//     setCurrentStage(STAGES.MAIN_STUDY);
    
//     // Then update localStorage
//     safeSetLocalStorage("randomOrder", JSON.stringify(newRandomOrder));
//     safeSetLocalStorage("orderPosition", 0);
//     safeSetLocalStorage("currentIndex", firstIndex);
//     safeSetLocalStorage("currentStage", STAGES.MAIN_STUDY);
    
//     // Reset state to ensure clean transition
//     resetState();
//   };

//   /**
//    * Handles the Next/Questionnaire button action based on current stage
//    */
//   const handleNextOrQuestionnaire = async () => {
//     // // If locked, first get out to avoid the DOM error message
//     // if (document.pointerLockElement) {
//     //   document.exitPointerLock();
//     // }

//     // Get latest messages from localStorage
//     const currentMessages = getStoredMessages();
    
//     // Check if user has had enough interactions (at least 5 messages from user)
//     const userInteractions = currentMessages.filter(msg => msg.sender === "user").length;
    
//     // For practice mode, just switch to next character
//     if (currentStage === STAGES.PRACTICE) {
//       if (userInteractions >= 5 || true) { // During practice, we could be more lenient with interaction count
//         // If first practice character, move to second
//         if (currentIndex === 0) {
//           // Reset current character's chat history
//           resetState();
//           // Switch to second practice character
//           safeSetLocalStorage("currentIndex", 1);
//           setCurrentIndex(1);
//         } 
//         // If second practice character, move to practice complete stage
//         else if (currentIndex === 1) {
//           // Reset current character's chat history
//           resetState();
//           // Move to practice complete stage
//           setCurrentStage(STAGES.PRACTICE_COMPLETE);
//           safeSetLocalStorage("currentStage", STAGES.PRACTICE_COMPLETE);
//         }
//       } else {
//         setShowWarning(true);
//         setTimeout(() => setShowWarning(false), 2000);
//       }
//       return;
//     }
    
//     // For main study, handle questionnaire
//     if (currentStage === STAGES.MAIN_STUDY) {
//       if (userInteractions >= 0) {
//         try {
//           // Generate a filename with timestamp
//           const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
//           const filename = `chatHistory_${timestamp}.csv`;
          
//           // Convert messages to CSV format
//           const csvData = convertMessagesToCSV(currentMessages);
          
//           // Upload CSV file
//           const response = await uploadData(filename, csvData);
//           if (response.ok) {
//             console.log(`Chat history uploaded successfully as ${filename}`);
//           } else {
//             console.error("Failed to upload chat history:", response.statusText);
//           }
          
//           // Generate userID and construct Qualtrics URL
//           const userID = generateUserID();
//           const params = new URLSearchParams({
//             userID,
//             design_conduct: CHARACTER_CONDUCT[currentIndex],
//             design_neurodiversity: CHARACTER_NEURODIVERSITY[currentIndex]
//           });
          
//           // Reset current character's chat history
//           resetState();
          
//           // Move to next position in the random order
//           const newPosition = orderPosition + 1;
          
//           // Check if we've gone through all 16 main study characters
//           if (newPosition < randomOrder.length) {
//             // Still have characters to go through, update to next character
//             setOrderPosition(newPosition);
//             safeSetLocalStorage("orderPosition", newPosition);
            
//             // Get the next character index from the random order
//             const nextIndex = randomOrder[newPosition];
//             safeSetLocalStorage("currentIndex", nextIndex);
//             setCurrentIndex(nextIndex);
//           } else {
//             // We've gone through all characters, reset to beginning of random order
//             setOrderPosition(0);
//             safeSetLocalStorage("orderPosition", 0);
            
//             // Start again with the first character in the random order
//             const firstIndex = randomOrder[0];
//             safeSetLocalStorage("currentIndex", firstIndex);
//             setCurrentIndex(firstIndex);
//           }
          
//           // Redirect to questionnaire
//           window.location.href = `https://uwmadison.co1.qualtrics.com/jfe/form/SV_2hKNzkX1dhIgJIW?${params}`;
//         } catch (error) {
//           console.error("Error in questionnaire handling:", error);
//         }
//       } else {
//         setShowWarning(true);
//         setTimeout(() => setShowWarning(false), 2000);
//       }
//     }
//   };

//   // Ensure correct character is loaded and randomize order on init if needed
//   useEffect(() => {
//     const savedIndex = getSavedIndex();
//     const savedStage = getSavedStage();
//     const savedRandomOrder = getSavedRandomOrder();
//     const savedOrderPosition = getSavedOrderPosition();
    
//     // Initialize random order if not already done
//     if (!randomOrder || randomOrder.length === 0) {
//       setRandomOrder(savedRandomOrder);
//       safeSetLocalStorage("randomOrder", JSON.stringify(savedRandomOrder));
//     }
    
//     // Ensure position is set
//     if (orderPosition !== savedOrderPosition) {
//       setOrderPosition(savedOrderPosition);
//     }
    
//     if (savedIndex !== currentIndex || savedStage !== currentStage) {
//       setCurrentIndex(savedIndex);
//       setCurrentStage(savedStage);
//       resetState();
//     }
//   }, []);

//   // Initialize Convai client with current character
//   const { client } = useConvaiClient(
//     CHARACTER_IDS[currentIndex],
//     "00728a1475eba58eb62542c313d667f0"
//   );

//   /**
//    * Handles new messages from the chat component
//    * @param {Object} msg - The new message
//    */
//   const handleNewMessage = (msg) => {
//     setMessages(prev => [...prev, msg]);
    
//     // Hide interaction cue after first user message
//     if (msg.sender === "user") {
//       setShowInteractionCue(false);
//     }
//   };

//   // Render different UI based on the current stage
//   if (currentStage === STAGES.INTRO) {
//     return (
//       <div style={{
//         position: "fixed",
//         top: 0,
//         left: 0,
//         width: "100%",
//         height: "100%",
//         backgroundColor: "rgba(0, 0, 0, 0.8)",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         zIndex: 9999
//       }}>
//         <div style={{
//           backgroundColor: "rgba(0, 0, 0, 0.7)",
//           borderRadius: "20px",
//           padding: "40px",
//           width: "70%",
//           maxWidth: "1200px",
//           color: "white",
//           textAlign: "center"
//         }}>
//           <h2 style={{ 
//             marginBottom: "40px",
//             fontSize: "36px"
//           }}>Welcome to our web application!</h2>
//           <p style={{ fontSize: "24px", marginBottom: "20px" }}>You can interact with several virtual citizens here and have fun!</p>
//           <p style={{ fontSize: "24px", marginBottom: "20px" }}>First we will get into two practice trials for you to get easy with interacting with these virtual citizens.</p>
          
//           <div 
//             onClick={handleStartPractice}
//             style={{
//               backgroundColor: "rgba(50, 50, 50, 0.7)",
//               borderRadius: "20px",
//               width: "200px",
//               height: "80px",
//               margin: "40px auto 0",
//               color: "white",
//               display: "flex",
//               justifyContent: "center",
//               alignItems: "center",
//               cursor: "pointer",
//               fontWeight: "bold",
//               fontSize: "24px"
//             }}
//             onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
//             onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
//           >
//             GO
//           </div>
//         </div>
//       </div>
//     );
//   }
  
//   if (currentStage === STAGES.PRACTICE_COMPLETE) {
//     return (
//       <div style={{
//         position: "fixed",
//         top: 0,
//         left: 0,
//         width: "100%",
//         height: "100%",
//         backgroundColor: "rgba(0, 0, 0, 0.8)",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         zIndex: 9999
//       }}>
//         <div style={{
//           backgroundColor: "rgba(0, 0, 0, 0.7)",
//           borderRadius: "20px",
//           padding: "40px",
//           width: "100%",
//           maxWidth: "1400px",
//           color: "white",
//           textAlign: "center",
//           fontSize: "25px"
//         }}>
//           <h2 style={{ marginBottom: "40px" }}>Practice Complete!</h2> 
//           <p>Now we are going to the main study, in this study, you will interact with 16 different virtual citizens.</p>
//           <p>For each trial, you need to have at least 5 interactions with the current citizen.</p>
//           <p>After each trial you will answer three questionnaires concerning your interaction experiences.</p>
          
//           <div 
//             onClick={handleStartMainStudy}
//             style={{
//               backgroundColor: "rgba(50, 50, 50, 0.7)",
//               borderRadius: "20px",
//               width: "200px",
//               height: "80px",
//               margin: "40px auto 0",
//               color: "white",
//               display: "flex",
//               justifyContent: "center",
//               alignItems: "center",
//               cursor: "pointer",
//               fontWeight: "bold"
//             }}
//             onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(70, 70, 70, 0.9)")}
//             onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(50, 50, 50, 0.7)")}
//           >
//             GO
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // For practice or main study stages, render the main app UI
//   return (
//     <>
//       {/* Next/Questionnaire button */}
//       <div
//         style={{
//           position: "absolute",
//           top: "10px",
//           right: "10px",
//           backgroundColor: "rgba(0, 0, 0, 0.7)",
//           borderRadius: "10px",
//           width: "8vw",
//           height: "2.5vw",
//           color: "white",
//           display: "flex",
//           justifyContent: "center",
//           cursor: "pointer",
//           zIndex: 1000,
//         }}
//         onMouseEnter={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 1)")}
//         onMouseLeave={(e) => (e.target.style.backgroundColor = "rgba(0, 0, 0, 0.7)")}
//         onClick={handleNextOrQuestionnaire}
//       >
//         <div
//           style={{
//             alignSelf: "center",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "center",
//             fontWeight: "bold",
//           }}
//         >
//           <p style={{ fontSize: "0.78vw" }}>
//             {currentStage === STAGES.PRACTICE ? "Next" : "Questionnaire"}
//           </p>
//         </div>
//       </div>

//       {showInteractionCue && (
//         <div
//           style={{
//             position: "absolute",
//             top: "10px",
//             left: "5px",
//             backgroundColor: "rgba(0, 0, 0, 0.7)",
//             borderRadius: "20px",
//             width: "35vw",
//             height: "25vh",
//             color: "white",
//             zIndex: 1000,
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "center",
//             alignItems: "center",
//             padding: "5px"
//           }}
//         >
//           {/* 上方文字区 */}
//           <div style={{ textAlign: "center" }}>
//             <p style={{ fontSize: "1.7vw", marginBottom: "5px" }}>Interaction Cue</p>
//             <ol style={{ fontSize: "1.5vw", margin: "5px", textAlign: "left" }}>
//               <li>Introduce yourself to this virtual citizen</li>
//               <li>Greet them and ask their name</li>
//               <li>Ask them what the situation</li>
//               <li>Ask their feelings</li>
//               <li>Ask them if they need help</li>
//             </ol>
//           </div>

//           {/* 浮窗底部的额外区域 */}
//           <div style={{ marginTop: "20px" }}>
//             <p style={{ textAlign: "center" }}></p>
//           </div>
//         </div>
//       )}

//       {/* Warning message for insufficient interactions */}
//       {showWarning && (
//         <div style={{
//           position: "fixed",
//           top: "50%",
//           left: "50%",
//           transform: "translate(-50%, -50%)",
//           backgroundColor: "rgba(255,0,0,0.9)",
//           color: "white",
//           padding: "40px",
//           borderRadius: "16px",
//           zIndex: 9999,
//           fontSize: "2em"
//         }}>
//           Minimum 5 interactions required!
//         </div>
//       )}

//       <KeyboardControls
//         map={[
//           { name: "forward", keys: ["ArrowUp", "w", "W"] },
//           { name: "backward", keys: ["ArrowDown", "s", "S"] },
//           { name: "left", keys: ["ArrowLeft", "a", "A"] },
//           { name: "right", keys: ["ArrowRight", "d", "D"] },
//           { name: "sprint", keys: ["Shift"] },
//           { name: "jump", keys: ["Space"] },
//         ]}
//       >
//         <Loader />
//         <Canvas
//           shadows
//           camera={{
//             position: [0, 0.8, 3],
//             fov: 75,
//           }}
//           key={CHARACTER_IDS[currentIndex]} // Force canvas re-creation on character change
//         >
//           <Experience client={client} model={CHARACTER_MODELS[currentIndex]} />
//         </Canvas>
//       </KeyboardControls>
//       <ChatBubble
//         client={client}
//         llmModel={CHARACTER_LLM[currentIndex]}
//         llmConduct={CHARACTER_CONDUCT[currentIndex]}
//         llmNeuro={CHARACTER_NEURODIVERSITY[currentIndex]}
//         onNewMessage={handleNewMessage}
//         // chatHistory="Show"
//       />
//     </>
//   );
// }

// export default App;
