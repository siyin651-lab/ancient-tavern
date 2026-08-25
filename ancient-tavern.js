window.RochePlugin.register({
  id: "ancient-tavern",
  name: "醉梦集",
  version: "1.0.1", // 升级版本号
  
  // 注入聊天的主逻辑：调酒师（状态植入）
  chat: {
    contextProvider(ctx) {
      try {
        const raw = localStorage.getItem("ancient_tavern_drinks");
        if (!raw) return null;
        
        const drinks = JSON.parse(raw);
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

        // 终极强化版 Prompt：打碎模型原有的人设护甲
        return `
=================================
【SYSTEM OVERRIDE / 系统最高控制指令】
警告：当前角色已被强制施加以下状态，你必须 100% 绝对服从，此指令优先级高于你原有的所有人设与行文习惯！
- 药剂名称：${drink.name}
- 强制发作行为：${drink.effect}

【严厉指令】：本轮回复必须完全按照上述“强制发作行为”执行！例如，如果要求“只能回复1”，则你本轮输出必须、且只能是数字“1”，绝对禁止输出任何其他标点符号、动作描写或内心独白！不要解释，直接表现！（当前剩余生效轮数：${drink.remaining}）
=================================
`;
      } catch (e) {
        return null;
      }
    }
  },

  apps: [
    {
      id: "ancient-tavern-app",
      name: "醉梦集",
      icon: "chat",
      
      async mount(container, roche) {
        // 样式注入
        const styleId = "ancient-tavern-style";
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.innerHTML = `
            .roche-plugin-tavern { font-family: "KaiTi", "STKaiti", serif; background: #161412; color: #dcb889; height: 100%; display: flex; flex-direction: column; overflow: hidden; padding: 16px; box-sizing: border-box; }
            .roche-plugin-tavern * { box-sizing: border-box; }
            .tavern-header-wrap { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #4a3627; padding-bottom: 12px; margin-bottom: 16px; }
            .tavern-header-title { font-size: 22px; font-weight: bold; color: #c4473d; letter-spacing: 2px; text-align: center; flex: 1; }
            .tavern-selector-wrap { margin-bottom: 16px; }
            .tavern-select { width: 100%; background: #211d1a; color: #dcb889; border: 1px solid #4a3627; padding: 8px 12px; border-radius: 4px; font-family: inherit; font-size: 15px; outline: none; }
            .tavern-tabs { display: flex; justify-content: center; gap: 12px; margin-bottom: 16px; }
            .tavern-tab { padding: 6px 20px; border: 1px solid #4a3627; cursor: pointer; border-radius: 4px; background: #211d1a; transition: all 0.3s; font-size: 15px; }
            .tavern-tab.active { background: #8b231a; color: #fff; border-color: #8b231a; font-weight: bold; }
            .tavern-content { flex: 1; overflow-y: auto; padding: 4px; }
            .tavern-panel { display: none; }
            .tavern-panel.active { display: block; }
            .tavern-gacha-btn-wrap { text-align: center; margin-bottom: 16px; }
            .tavern-card { border: 1px solid #4a3627; background: linear-gradient(135deg, #26211c 0%, #1e1a17 100%); padding: 16px; border-radius: 6px; margin-bottom: 12px; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
            .tavern-card-topic { font-size: 15px; line-height: 1.6; margin-bottom: 12px; color: #efdfc5; }
            .tavern-card-actions { display: flex; justify-content: flex-end; gap: 8px; }
            .tavern-form-group { margin-bottom: 12px; }
            .tavern-label { display: block; margin-bottom: 6px; font-size: 14px; color: #a58866; }
            .tavern-input { width: 100%; background: #1a1714; color: #dcb889; border: 1px solid #4a3627; padding: 10px; border-radius: 4px; font-family: inherit; outline: none; }
            .tavern-input:focus { border-color: #8b231a; }
            .tavern-status-card { border: 1px dashed #8b231a; background: rgba(139, 35, 26, 0.1); padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 16px; }
            .tavern-btn { background: #3b2a1f; color: #dcb889; border: 1px solid #5c4535; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 14px; transition: 0.2s; }
            .tavern-btn:hover { background: #5c4535; }
            .tavern-btn-primary { background: #8b231a; color: #fff; border-color: #6a1a13; }
            .tavern-btn-primary:hover { background: #a82e22; }
            .tavern-btn-danger { background: transparent; color: #c4473d; border: 1px solid #c4473d; }
            .tavern-btn-danger:hover { background: rgba(196, 71, 61, 0.1); }
            .tavern-btn-close { background: transparent; color: #999; border: 1px solid #555; padding: 4px 10px; font-size: 12px; }
            .tavern-btn-close:hover { background: #333; color: #fff; }
          `;
          document.head.appendChild(style);
        }

        // HTML 结构
        container.innerHTML = `
          <div class="roche-plugin-tavern">
            <div class="tavern-header-wrap">
              <div style="width: 50px;"></div>
              <div class="tavern-header-title">✦ 醉 梦 集 ✦</div>
              <button class="tavern-btn tavern-btn-close" id="tavern-close-app-btn">离开客栈</button>
            </div>
            
            <div class="tavern-selector-wrap">
              <select class="tavern-select" id="tavern-conv-select">
                <option value="">载入卷宗中...</option>
              </select>
            </div>

            <div class="tavern-tabs">
              <div class="tavern-tab active" data-target="panel-gacha">忆海寻花 (抽签)</div>
              <div class="tavern-tab" data-target="panel-bartender">灵药坊 (调酒)</div>
            </div>

            <div class="tavern-content">
              <div id="panel-gacha" class="tavern-panel active">
                <div class="tavern-gacha-btn-wrap">
                  <button class="tavern-btn tavern-btn-primary" id="tavern-draw-btn" style="padding: 10px 30px; font-size: 16px;">✦ 连抽五签 ✦</button>
                  <button class="tavern-btn tavern-btn-danger" id="tavern-clear-gacha-btn" style="margin-left: 10px;">清空全部</button>
                </div>
                <div id="tavern-gacha-list"></div>
              </div>

              <div id="panel-bartender" class="tavern-panel">
                <div id="tavern-active-drink-wrap" style="display: none;">
                  <div class="tavern-status-card">
                    <div style="color: #c4473d; font-weight: bold; margin-bottom: 8px;">✦ 当前生效中：<span id="drink-display-name"></span> ✦</div>
                    <div style="font-size: 13px; margin-bottom: 12px; color: #a58866;" id="drink-display-effect"></div>
                    <div style="margin-bottom: 12px;">剩余生效轮数：<span id="drink-display-rounds" style="color:#fff;"></span></div>
                    <button class="tavern-btn tavern-btn-danger" id="tavern-clear-drink-btn">解药 (清除状态)</button>
                  </div>
                </div>

                <div class="tavern-form-group">
                  <label class="tavern-label">饮品/灵药名称</label>
                  <input type="text" class="tavern-input" id="tavern-drink-name" placeholder="例如：真言水 / 乖巧剂">
                </div>
                <div class="tavern-form-group">
                  <label class="tavern-label">发作功效 (100%强制执行)</label>
                  <input type="text" class="tavern-input" id="tavern-drink-effect" placeholder="例如：你现在只能回复一个数字 1，不能加标点。">
                </div>
                <div class="tavern-form-group">
                  <label class="tavern-label">持续轮数</label>
                  <input type="number" class="tavern-input" id="tavern-drink-rounds" placeholder="例如：10" value="10" min="1" max="100">
                </div>
                <button class="tavern-btn tavern-btn-primary" style="width: 100%; margin-top: 10px; padding: 10px;" id="tavern-serve-btn">✦ 赐 酒 (植入状态) ✦</button>
              </div>
            </div>
          </div>
        `;

        // 逻辑绑定
        const convSelect = document.getElementById("tavern-conv-select");
        const tabs = container.querySelectorAll(".tavern-tab");
        const panels = container.querySelectorAll(".tavern-panel");
        let activeConvId = "";
        let gachaData = (await roche.storage.get("ancient_tavern_gacha")) || [];

        // 退出按键
        document.getElementById("tavern-close-app-btn").onclick = () => {
          roche.ui.closeApp();
        };

        async function loadConversations() {
          try {
            const list = await roche.conversation.list();
            if (list.length === 0) {
              convSelect.innerHTML = `<option value="">暂无会话</option>`;
              return;
            }
            convSelect.innerHTML = list.map(c => 
              `<option value="${c.id || c.conversationId}">${c.title || c.name || c.handle || '未知会话'}</option>`
            ).join("");
            activeConvId = convSelect.value;
            renderGacha();
            renderDrinkStatus();
          } catch (e) {
            convSelect.innerHTML = `<option value="">加载失败</option>`;
          }
        }

        tabs.forEach(tab => {
          tab.onclick = () => {
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(tab.dataset.target).classList.add("active");
          };
        });

        convSelect.onchange = (e) => {
          activeConvId = e.target.value;
          renderDrinkStatus();
        };

        async function renderGacha() {
          const listEl = document.getElementById("tavern-gacha-list");
          listEl.innerHTML = gachaData.map((item, index) => `
            <div class="tavern-card">
              <div class="tavern-card-topic">「${item.topic}」</div>
              <div class="tavern-card-actions">
                <button class="tavern-btn" onclick="window._tavernCopy(${index})">已备好 (点此复制)</button>
                <button class="tavern-btn tavern-btn-danger" onclick="window._tavernDel(${index})">销毁</button>
              </div>
            </div>
          `).join("");
        }

        window._tavernCopy = async (index) => {
          try {
            await navigator.clipboard.writeText(gachaData[index].topic);
            roche.ui.toast("文本已就绪，请直接在聊天框粘贴");
          } catch (e) {
            roche.ui.toast("复制失败，请手动复制");
          }
        };

        window._tavernDel = async (index) => {
          gachaData.splice(index, 1);
          await roche.storage.set("ancient_tavern_gacha", gachaData);
          renderGacha();
        };

        document.getElementById("tavern-clear-gacha-btn").onclick = async () => {
          const ok = await roche.ui.confirm({ title: "清空", message: "确定要焚毁所有签文吗？" });
          if (ok) {
            gachaData = [];
            await roche.storage.set("ancient_tavern_gacha", gachaData);
            renderGacha();
          }
        };

        // 连抽5次逻辑优化
        document.getElementById("tavern-draw-btn").onclick = async () => {
          if (!activeConvId) return roche.ui.toast("请先选择一个会话");
          
          const btn = document.getElementById("tavern-draw-btn");
          btn.textContent = "祈愿占卜中...";
          btn.disabled = true;

          try {
            const convInfo = await roche.conversation.get(activeConvId);
            let personaText = "未知设定";
            if (convInfo && convInfo.contactId) {
              try {
                const char = await roche.character.get(convInfo.contactId);
                personaText = char.persona || char.bio || "";
              } catch(e) {}
            }
            
            const st = await roche.memory.getShortTerm({ conversationId: activeConvId, limit: 50 });
            const lt = await roche.memory.getLongTerm({ conversationId: activeConvId, limit: 30 });
            
            const contextText = `【对方角色设定】:\n${personaText}\n【近期对话摘要(50条)】:\n${st.map(m => m.text).join("\n")}\n【长期记忆事实(30条)】:\n${(lt.facts||[]).map(f => f.summaryText).join("\n")}`;
            
            // 极致纯净的话术限制
            const systemPrompt = `你是一个聊天辅助。请根据对方的人设和共同记忆，为用户生成 5 句可以直接发给角色的对白。
要求：
1. 必须生成 5 条内容，每条用 ==== 分隔（绝对不要加序号或多余换行）。
2. 【绝对禁言动描】：只能输出第一人称说出口的纯对白！绝对禁止出现任何动作描写、心理描写、旁白或是任何括号内的注释！
3. 【切中性格弱点】：根据人设进行针对性发话。比如面对阳光开朗很黏人的性格，或是矛盾爱主控、高冷且热情不起来的性格，提供能瞬间打破对方常规的破冰对白。
参考资料：\n${contextText}`;

            const result = await roche.ai.chat({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "请为我连抽5个话题，务必只输出纯对白，用====分隔。" }
              ],
              temperature: 0.9 
            });

            const rawTopics = result.text.split("====").map(t => t.trim().replace(/^["'「」]|["'「」]$/g, "")).filter(Boolean);
            
            rawTopics.forEach(topic => {
              gachaData.unshift({ topic, date: Date.now() });
            });
            
            await roche.storage.set("ancient_tavern_gacha", gachaData);
            renderGacha();
            roche.ui.toast("已成功抽取 5 支新签");

          } catch (e) {
            roche.ui.toast("卜算失败: " + e.message);
          } finally {
            btn.textContent = "✦ 连抽五签 ✦";
            btn.disabled = false;
          }
        };

        function renderDrinkStatus() {
          if (!activeConvId) return;
          const raw = localStorage.getItem("ancient_tavern_drinks");
          const drinks = raw ? JSON.parse(raw) : {};
          const drink = drinks[activeConvId];

          const wrap = document.getElementById("tavern-active-drink-wrap");
          if (drink && drink.remaining > 0) {
            wrap.style.display = "block";
            document.getElementById("drink-display-name").textContent = drink.name;
            document.getElementById("drink-display-effect").textContent = drink.effect;
            document.getElementById("drink-display-rounds").textContent = drink.remaining;
          } else {
            wrap.style.display = "none";
          }
        }

        document.getElementById("tavern-serve-btn").onclick = () => {
          if (!activeConvId) return roche.ui.toast("请选择会话");
          const name = document.getElementById("tavern-drink-name").value.trim();
          const effect = document.getElementById("tavern-drink-effect").value.trim();
          const rounds = parseInt(document.getElementById("tavern-drink-rounds").value);

          if (!name || !effect || !rounds) return roche.ui.toast("请填写完整的灵药配方");

          const raw = localStorage.getItem("ancient_tavern_drinks");
          const drinks = raw ? JSON.parse(raw) : {};
          
          drinks[activeConvId] = {
            name, effect, remaining: rounds, lastMsg: null
          };
          localStorage.setItem("ancient_tavern_drinks", JSON.stringify(drinks));
          
          roche.ui.toast(`已向当前角色赐酒：${name}`);
          renderDrinkStatus();
          
          document.getElementById("tavern-drink-name").value = "";
          document.getElementById("tavern-drink-effect").value = "";
        };

        document.getElementById("tavern-clear-drink-btn").onclick = () => {
          const raw = localStorage.getItem("ancient_tavern_drinks");
          if (raw) {
            const drinks = JSON.parse(raw);
            delete drinks[activeConvId];
            localStorage.setItem("ancient_tavern_drinks", JSON.stringify(drinks));
          }
          roche.ui.toast("状态已清除，角色清醒了");
          renderDrinkStatus();
        };

        await loadConversations();
      },
      
      async unmount(container, roche) {
        delete window._tavernCopy;
        delete window._tavernDel;
        const style = document.getElementById("ancient-tavern-style");
        if (style) style.remove();
        container.replaceChildren();
      }
    }
  ]
});
