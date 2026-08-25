window.RochePlugin.register({
  id: "ancient-tavern",
  name: "醉梦集",
  version: "1.0.0",
  
  // 注入聊天的主逻辑：调酒师（状态植入）
  chat: {
    contextProvider(ctx) {
      try {
        // 使用原生 localStorage 同步读取，避免上下文中 roche API 作用域限制
        const raw = localStorage.getItem("ancient_tavern_drinks");
        if (!raw) return null;
        
        const drinks = JSON.parse(raw);
        const drink = drinks[ctx.conversationId];
        
        if (!drink || drink.remaining <= 0) return null;

        // 使用最新消息的文本作为签名，防止用户重新生成（Regenerate）时重复扣除轮数
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

        // 拼接最高优先级的 System Prompt
        return `【系统最高强制设定】你刚才饮下了一杯名为“${drink.name}”的特制灵药/饮品。
【药效设定】：${drink.effect}
【系统指令】：你必须在接下来的对话中，100%绝对、完全地遵从上述药效设定来回应我。不要解释药效，直接表现出来。
（当前状态剩余生效轮数：${drink.remaining} 轮）`;
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
        // 1. 注入古风样式
        const styleId = "ancient-tavern-style";
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.innerHTML = `
            .roche-plugin-tavern { font-family: "KaiTi", "STKaiti", serif; background: #161412; color: #dcb889; height: 100%; display: flex; flex-direction: column; overflow: hidden; padding: 16px; box-sizing: border-box; }
            .roche-plugin-tavern * { box-sizing: border-box; }
            .tavern-header { text-align: center; font-size: 22px; font-weight: bold; border-bottom: 1px solid #4a3627; padding-bottom: 12px; margin-bottom: 16px; color: #c4473d; letter-spacing: 2px; }
            .tavern-selector-wrap { margin-bottom: 16px; }
            .tavern-select { width: 100%; background: #211d1a; color: #dcb889; border: 1px solid #4a3627; padding: 8px 12px; border-radius: 4px; font-family: inherit; font-size: 15px; outline: none; }
            .tavern-tabs { display: flex; justify-content: center; gap: 12px; margin-bottom: 16px; }
            .tavern-tab { padding: 6px 20px; border: 1px solid #4a3627; cursor: pointer; border-radius: 4px; background: #211d1a; transition: all 0.3s; font-size: 15px; }
            .tavern-tab.active { background: #8b231a; color: #fff; border-color: #8b231a; font-weight: bold; }
            .tavern-content { flex: 1; overflow-y: auto; padding: 4px; }
            .tavern-panel { display: none; }
            .tavern-panel.active { display: block; }
            
            /* 抽卡 UI */
            .tavern-gacha-btn-wrap { text-align: center; margin-bottom: 16px; }
            .tavern-card { border: 1px solid #4a3627; background: linear-gradient(135deg, #26211c 0%, #1e1a17 100%); padding: 16px; border-radius: 6px; margin-bottom: 12px; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
            .tavern-card-topic { font-size: 15px; line-height: 1.6; margin-bottom: 12px; color: #efdfc5; }
            .tavern-card-actions { display: flex; justify-content: flex-end; gap: 8px; }
            
            /* 调酒 UI */
            .tavern-form-group { margin-bottom: 12px; }
            .tavern-label { display: block; margin-bottom: 6px; font-size: 14px; color: #a58866; }
            .tavern-input { width: 100%; background: #1a1714; color: #dcb889; border: 1px solid #4a3627; padding: 10px; border-radius: 4px; font-family: inherit; outline: none; }
            .tavern-input:focus { border-color: #8b231a; }
            .tavern-status-card { border: 1px dashed #8b231a; background: rgba(139, 35, 26, 0.1); padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 16px; }
            
            /* 按钮 */
            .tavern-btn { background: #3b2a1f; color: #dcb889; border: 1px solid #5c4535; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 14px; transition: 0.2s; }
            .tavern-btn:hover { background: #5c4535; }
            .tavern-btn-primary { background: #8b231a; color: #fff; border-color: #6a1a13; }
            .tavern-btn-primary:hover { background: #a82e22; }
            .tavern-btn-danger { background: transparent; color: #c4473d; border: 1px solid #c4473d; }
            .tavern-btn-danger:hover { background: rgba(196, 71, 61, 0.1); }
          `;
          document.head.appendChild(style);
        }

        // 2. 挂载 HTML 结构
        container.innerHTML = `
          <div class="roche-plugin-tavern">
            <div class="tavern-header">✦ 醉 梦 集 ✦</div>
            
            <!-- 会话选择器 -->
            <div class="tavern-selector-wrap">
              <select class="tavern-select" id="tavern-conv-select">
                <option value="">载入卷宗中...</option>
              </select>
            </div>

            <!-- Tabs -->
            <div class="tavern-tabs">
              <div class="tavern-tab active" data-target="panel-gacha">忆海寻花 (抽签)</div>
              <div class="tavern-tab" data-target="panel-bartender">灵药坊 (调酒)</div>
            </div>

            <div class="tavern-content">
              <!-- 抽签面板 -->
              <div id="panel-gacha" class="tavern-panel active">
                <div class="tavern-gacha-btn-wrap">
                  <button class="tavern-btn tavern-btn-primary" id="tavern-draw-btn" style="padding: 10px 30px; font-size: 16px;">✦ 卜一卦 (抽卡) ✦</button>
                  <button class="tavern-btn tavern-btn-danger" id="tavern-clear-gacha-btn" style="margin-left: 10px;">清空全部</button>
                </div>
                <div id="tavern-gacha-list"></div>
              </div>

              <!-- 调酒面板 -->
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
                  <input type="text" class="tavern-input" id="tavern-drink-name" placeholder="例如：忘忧散 / 苹果酒">
                </div>
                <div class="tavern-form-group">
                  <label class="tavern-label">发作功效 (100%强制执行)</label>
                  <input type="text" class="tavern-input" id="tavern-drink-effect" placeholder="例如：只能说恭维我的话 / 变成一只猫">
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

        // 3. 逻辑绑定
        const convSelect = document.getElementById("tavern-conv-select");
        const tabs = container.querySelectorAll(".tavern-tab");
        const panels = container.querySelectorAll(".tavern-panel");
        let activeConvId = "";
        let gachaData = (await roche.storage.get("ancient_tavern_gacha")) || [];

        // 加载会话列表
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

        // Tab 切换
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

        // --- 抽签 (Gacha) 逻辑 ---
        async function renderGacha() {
          const listEl = document.getElementById("tavern-gacha-list");
          listEl.innerHTML = gachaData.map((item, index) => `
            <div class="tavern-card">
              <div class="tavern-card-topic">「${item.topic}」</div>
              <div class="tavern-card-actions">
                <button class="tavern-btn" onclick="window._tavernCopy(${index})">抄录 (去发送)</button>
                <button class="tavern-btn tavern-btn-danger" onclick="window._tavernDel(${index})">销毁</button>
              </div>
            </div>
          `).join("");
        }

        window._tavernCopy = async (index) => {
          try {
            await navigator.clipboard.writeText(gachaData[index].topic);
            roche.ui.toast("已抄录至纸笺，请前往聊天框粘贴发送");
          } catch (e) {
            roche.ui.toast("抄录失败，请手动复制");
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

        document.getElementById("tavern-draw-btn").onclick = async () => {
          if (!activeConvId) return roche.ui.toast("请先选择一个会话");
          
          const btn = document.getElementById("tavern-draw-btn");
          btn.textContent = "卜算中...";
          btn.disabled = true;

          try {
            // 获取记忆上下文
            const st = await roche.memory.getShortTerm({ conversationId: activeConvId, limit: 15 });
            const lt = await roche.memory.getLongTerm({ conversationId: activeConvId, limit: 10 });
            
            const contextText = `近期对话摘要:\n${st.map(m => m.text).join("\n")}\n长期记忆事实:\n${(lt.facts||[]).map(f => f.summaryText).join("\n")}`;
            
            const result = await roche.ai.chat({
              messages: [
                { role: "system", content: "你是一个占卜师。请根据以下角色记忆，为用户生成一个极具趣味性、可以在聊天中抛给角色的“闲聊话题”或“互动动作”。\n要求：\n1. 用第一人称（用户）向角色说的原话或动作输出，不要任何多余的解释，不要前后缀。\n2. 字数限制在50字以内，带有古风意境，或极其切合对方近期记忆。\n\n记忆参考：\n" + contextText },
                { role: "user", content: "请为我抽一张话题卡。" }
              ],
              temperature: 0.8
            });

            const topic = result.text.replace(/["'「」]/g, "").trim();
            gachaData.unshift({ topic, date: Date.now() });
            await roche.storage.set("ancient_tavern_gacha", gachaData);
            renderGacha();
            roche.ui.toast("新签已出");

          } catch (e) {
            roche.ui.toast("卜算失败: " + e.message);
          } finally {
            btn.textContent = "✦ 卜一卦 (抽卡) ✦";
            btn.disabled = false;
          }
        };

        // --- 调酒师 (Bartender) 逻辑 ---
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
        // 清理绑定的全局方法与样式
        delete window._tavernCopy;
        delete window._tavernDel;
        const style = document.getElementById("ancient-tavern-style");
        if (style) style.remove();
        container.replaceChildren();
      }
    }
  ]
});