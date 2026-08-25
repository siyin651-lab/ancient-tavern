// 注入聊天的主逻辑：调酒师（状态植入）
  chat: {
    contextProvider(ctx) {
      try {
        const raw = localStorage.getItem("ancient_tavern_drinks");
        if (!raw) return null;
        
        const drinks = JSON.parse(raw);
        // 匹配当前会话 ID
        const drink = drinks[ctx.conversationId];
        
        if (!drink || drink.remaining <= 0) return null;

        const msgSig = ctx.latestUserMessage ? ctx.latestUserMessage.text : "";
        if (drink.lastMsg !== msgSig) {
          drink.remaining--;
          drink.lastMsg = msgSig;
          localStorage.setItem("ancient_tavern_drinks", JSON.stringify(drinks));
        }

        if (drink.remaining <= 0) {
          delete drinks[ctx.conversationId];
          localStorage.setItem("ancient_tavern_drinks", JSON.stringify(drinks));
          return null;
        }

        // 调试用：在控制台打印，确认是否成功注入
        console.log("[醉梦集] 成功向会话注入药效:", ctx.conversationId, "药效:", drink.effect);

        // 增强版 Prompt：使用极端强制语气，打断 AI 的原有思考路径
        return `

=================================
【SYSTEM OVERRIDE / 系统最高控制指令】
当前角色已被强制施加以下状态，必须100%绝对服从，优先级高于原有所有人设：
- 药剂名称：${drink.name}
- 强制发作行为：${drink.effect}

【严厉警告】：无论原有性格如何，本轮回复必须完全且绝对地按照上述“强制发作行为”执行！如果要求“只能回复1”，则输出且仅能输出一个数字“1”，禁止任何标点符号、动作描写或心理描写！（当前剩余生效轮数：${drink.remaining}）
=================================

`;
      } catch (e) {
        return null;
      }
    }
  },
