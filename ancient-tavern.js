window.RochePlugin.register({
  id: "blossom-diary",
  name: "落樱手札",
  version: "1.1.0",
  apps: [
    {
      id: "blossom-app",
      name: "落樱手札",
      icon: "menu_book",
      
      async mount(container, roche) {
        // --- 1. 注入落樱水彩风样式 ---
        const styleId = "blossom-style";
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.innerHTML = `
            .roche-plugin-blossom { 
              font-family: "KaiTi", "STKaiti", serif; 
              background: linear-gradient(135deg, #fff5f5 0%, #fde6e8 50%, #f9d8db 100%);
              color: #5c3c43; 
              height: 100%; 
              display: flex; 
              flex-direction: column; 
              overflow: hidden; 
              padding: 16px; 
              box-sizing: border-box;
              position: relative;
            }
            .roche-plugin-blossom::before {
              content: "";
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 40%),
                                radial-gradient(circle at 80% 70%, rgba(255,192,203,0.2) 0%, transparent 50%);
              pointer-events: none;
              z-index: 0;
            }
            .roche-plugin-blossom * { box-sizing: border-box; z-index: 1; position: relative; }
            
            .bl-header { text-align: center; font-size: 20px; font-weight: bold; color: #b4757c; margin-bottom: 16px; letter-spacing: 2px; }
            
            .bl-glass-panel {
              background: rgba(255, 255, 255, 0.55);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.8);
              border-radius: 12px;
              padding: 12px;
              box-shadow: 0 4px 12px rgba(200, 150, 150, 0.1);
            }
            
            .bl-select { width: 100%; background: rgba(255,255,255,0.7); color: #5c3c43; border: 1px solid #e8c5c9; padding: 8px 12px; border-radius: 8px; font-family: inherit; font-size: 15px; outline: none; margin-bottom: 12px; }
            
            .bl-tabs { display: flex; justify-content: center; gap: 12px; margin-bottom: 16px; }
            .bl-tab { padding: 8px 24px; cursor: pointer; border-radius: 20px; background: rgba(255,255,255,0.6); border: 1px solid #e8c5c9; transition: all 0.3s; font-size: 15px; color: #8e5c63; }
            .bl-tab.active { background: #d7949b; color: #fff; border-color: #d7949b; box-shadow: 0 2px 8px rgba(215, 148, 155, 0.4); }
            
            .bl-content { flex: 1; overflow-y: auto; padding-right: 4px; }
            .bl-content::-webkit-scrollbar { width: 6px; }
            .bl-content::-webkit-scrollbar-thumb { background: #e8c5c9; border-radius: 4px; }
            
            .bl-panel { display: none; animation: fadeIn 0.3s ease-in-out; }
            .bl-panel.active { display: block; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            
            /* 按钮与输入框 */
            .bl-btn { background: #fdf5f6; color: #b4757c; border: 1px solid #e8c5c9; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 14px; transition: 0.2s; }
            .bl-btn:hover { background: #fbebee; }
            .bl-btn-primary { background: #d7949b; color: #fff; border-color: #c98087; }
            .bl-btn-primary:hover { background: #c98087; }
            .bl-btn-text { background: transparent; border: none; color: #b4757c; text-decoration: underline; padding: 4px; cursor: pointer; font-size: 13px; }
            
            .bl-textarea { width: 100%; background: rgba(255,255,255,0.7); border: 1px solid #e8c5c9; border-radius: 8px; padding: 10px; font-family: inherit; font-size: 14px; color: #5c3c43; outline: none; resize: vertical; min-height: 80px; }
            .bl-textarea:focus { border-color: #d7949b; background: rgba(255,255,255,0.9); }
            
            /* 抽签卡片 */
            .bl-card { margin-bottom: 12px; }
            .bl-card-topic { font-size: 15px; line-height: 1.6; margin-bottom: 8px; }
            .bl-card-actions { display: flex; justify-content: flex-end; gap: 8px; }
            
            /* 日记气泡 */
            .bl-diary-box { margin-bottom: 16px; padding: 12px; border-left: 3px solid #d7949b; }
            .bl-diary-meta { font-size: 12px; color: #b4757c; margin-bottom: 6px; }
            .bl-diary-text { font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 8px; }
            .bl-diary-reply { background: rgba(255,255,255,0.5); padding: 8px; border-radius: 6px; font-size: 13px; margin-top: 8px; border-left: 2px solid #a8bfb4; }
            
            .bl-sub-tabs { display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid rgba(232, 197, 201, 0.5); padding-bottom: 8px; }
            .bl-sub-tab { font-size: 14px; color: #a98387; cursor: pointer; padding: 4px 8px; }
            .bl-sub-tab.active { color: #d7949b; font-weight: bold; border-bottom: 2px solid #d7949b; }
            
            .bl-loader { text-align: center; color: #b4757c; font-size: 13px; padding: 10px; }
          `;
          document.head.appendChild(style);
        }

        // --- 2. 默认的抽签抗人机规则 ---
        const DEFAULT_RULES = "要求极度贴合角色性格进行个性化发散。拒绝任何机械、死板、AI味的客套话。如果对方是阳光开朗的性格，话题要生动活泼甚至带点黏人；如果对方是性格冷淡、爱主控却又高冷热情不起来的类型，话题可以带些反差、试探或不按常理出牌的破冰之举。只需输出纯粹的对白语句，绝对不加任何动作描写。";

        container.innerHTML = `
          <div class="roche-plugin-blossom">
            <div class="bl-header">✦ 落 樱 手 札 ✦</div>
            
            <select class="bl-select bl-glass-panel" id="bl-conv-select">
              <option value="">载入记忆羁绊中...</option>
            </select>

            <div class="bl-tabs">
              <div class="bl-tab active" data-target="panel-gacha">寻花 (抽签)</div>
              <div class="bl-tab" data-target="panel-diary">手札 (日记)</div>
            </div>

            <div class="bl-content">
              <!-- 抽签面板 -->
              <div id="panel-gacha" class="bl-panel active">
                <div class="bl-glass-panel" style="margin-bottom: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight:bold; color: #8e5c63;">✦ 抽签设定</span>
                    <button class="bl-btn-text" id="bl-toggle-rule-btn">修改规则</button>
                  </div>
                  <div id="bl-rule-edit-area" style="display:none;">
                    <textarea class="bl-textarea" id="bl-rule-input" placeholder="输入自定义的AI生成要求..."></textarea>
                    <div style="text-align:right; margin-top:8px;">
                      <button class="bl-btn bl-btn-primary" id="bl-save-rule-btn" style="padding: 4px 12px;">保存规则</button>
                    </div>
                  </div>
                  <div style="text-align: center; margin-top: 16px;">
                    <button class="bl-btn bl-btn-primary" id="bl-draw-btn" style="width: 100%; font-size: 15px; padding: 10px;">✦ 连抽五签 ✦</button>
                  </div>
                </div>
                <div id="bl-gacha-list"></div>
              </div>

              <!-- 日记面板 -->
              <div id="panel-diary" class="bl-panel">
                <div class="bl-glass-panel">
                  <div class="bl-sub-tabs">
                    <div class="bl-sub-tab active" data-sub="sub-user-write">我写他评</div>
                    <div class="bl-sub-tab" data-sub="sub-char-write">他写我评</div>
                  </div>
                  
                  <!-- 我写他评 -->
                  <div id="sub-user-write" class="bl-sub-panel active">
                    <textarea class="bl-textarea" id="bl-my-diary-input" placeholder="写下今天的日记或心情，给他看看吧..."></textarea>
                    <button class="bl-btn bl-btn-primary" id="bl-post-my-diary-btn" style="width: 100%; margin-top: 8px;">落笔成信</button>
                  </div>
                  
                  <!-- 他写我评 -->
                  <div id="sub-char-write" class="bl-sub-panel" style="display:none;">
                    <div style="text-align:center; margin-bottom:12px;">
                      <button class="bl-btn bl-btn-primary" id="bl-gen-char-diary-btn">✦ 偷看他的日记 ✦</button>
                    </div>
                    <div id="bl-char-diary-display" style="display:none; margin-bottom: 12px;" class="bl-diary-box">
                      <div class="bl-diary-meta">他的新日记：</div>
                      <div class="bl-diary-text" id="bl-char-diary-text"></div>
                    </div>
                    <div id="bl-comment-area" style="display:none;">
                      <textarea class="bl-textarea" id="bl-my-comment-input" placeholder="写下你的评论..."></textarea>
                      <button class="bl-btn bl-btn-primary" id="bl-post-comment-btn" style="width: 100%; margin-top: 8px;">发送评论</button>
                    </div>
                  </div>

                  <!-- 历史日记流 -->
                  <div style="margin-top: 24px; border-top: 1px dashed #e8c5c9; padding-top: 16px;">
                    <div style="font-weight:bold; color: #8e5c63; margin-bottom:12px;">过往手札</div>
                    <div id="bl-diary-feed"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="position: absolute; bottom: 16px; right: 16px; z-index: 10;">
              <button class="bl-btn" style="padding: 4px 10px; font-size:12px;" onclick="roche.ui.closeApp()">收起</button>
            </div>
          </div>
        `;

        // --- 3. 核心数据与逻辑绑定 ---
        const convSelect = document.getElementById("bl-conv-select");
        let activeConvId = "";
        
        // 存储读取
        let customRule = (await roche.storage.get("blossom_gacha_rule")) || DEFAULT_RULES;
        let gachaData = (await roche.storage.get("blossom_gacha_data")) || [];
        let diaryFeed = (await roche.storage.get("blossom_diary_feed")) || {}; 
        // diaryFeed 结构: { [convId]: [ { type: 'user'|'char', content, reply, date } ] }

        document.getElementById("bl-rule-input").value = customRule;

        // 标签切换
        const tabs = container.querySelectorAll(".bl-tab");
        const panels = container.querySelectorAll(".bl-panel");
        tabs.forEach(tab => {
          tab.onclick = () => {
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(tab.dataset.target).classList.add("active");
          };
        });

        const subTabs = container.querySelectorAll(".bl-sub-tab");
        const subPanels = container.querySelectorAll(".bl-sub-panel");
        subTabs.forEach(tab => {
          tab.onclick = () => {
            subTabs.forEach(t => t.classList.remove("active"));
            subPanels.forEach(p => p.style.display = "none");
            tab.classList.add("active");
            document.getElementById(tab.dataset.sub).style.display = "block";
          };
        });

        // 加载会话
        async function loadConversations() {
          try {
            const list = await roche.conversation.list();
            if (list.length === 0) {
              convSelect.innerHTML = `<option value="">暂无会话</option>`;
              return;
            }
            convSelect.innerHTML = list.map(c => 
              `<option value="${c.id || c.conversationId}">${c.title || c.name || c.handle}</option>`
            ).join("");
            activeConvId = convSelect.value;
            renderGacha();
            renderDiaryFeed();
          } catch (e) {}
        }

        convSelect.onchange = (e) => {
          activeConvId = e.target.value;
          renderDiaryFeed();
        };

        // --- 4. 抽签模块逻辑 ---
        document.getElementById("bl-toggle-rule-btn").onclick = () => {
          const area = document.getElementById("bl-rule-edit-area");
          area.style.display = area.style.display === "none" ? "block" : "none";
        };

        document.getElementById("bl-save-rule-btn").onclick = async () => {
          customRule = document.getElementById("bl-rule-input").value.trim();
          await roche.storage.set("blossom_gacha_rule", customRule);
          roche.ui.toast("生成规则已保存");
          document.getElementById("bl-rule-edit-area").style.display = "none";
        };

        async function renderGacha() {
          const listEl = document.getElementById("bl-gacha-list");
          listEl.innerHTML = gachaData.map((item, index) => `
            <div class="bl-glass-panel bl-card">
              <div class="bl-card-topic">「${item.topic}」</div>
              <div class="bl-card-actions">
                <button class="bl-btn" onclick="window._blCopy(${index})">点此复制</button>
                <button class="bl-btn bl-btn-text" style="color:#d7949b;" onclick="window._blDel(${index})">删除</button>
              </div>
            </div>
          `).join("");
        }

        window._blCopy = async (index) => {
          await navigator.clipboard.writeText(gachaData[index].topic);
          roche.ui.toast("文本已就绪，请前往聊天框粘贴");
        };

        window._blDel = async (index) => {
          gachaData.splice(index, 1);
          await roche.storage.set("blossom_gacha_data", gachaData);
          renderGacha();
        };

        document.getElementById("bl-draw-btn").onclick = async () => {
          if (!activeConvId) return roche.ui.toast("请选择会话");
          const btn = document.getElementById("bl-draw-btn");
          btn.textContent = "落樱祈愿中..."; btn.disabled = true;

          try {
            const st = await roche.memory.getShortTerm({ conversationId: activeConvId, limit: 30 });
            const contextText = st.map(m => m.text).join("\n");
            
            const systemPrompt = `你是一个聊天辅助。请根据我和角色的近期共同记忆，生成 5 句可以直接发给角色的对白。
【用户自定义规则】：${customRule}
要求：
1. 用 ==== 分隔5条内容（不要序号或多余换行）。
2. 【必须】只输出纯对白语句！绝对禁止出现动作描写、心理描写、旁白或括号解释！
近期记忆参考：\n${contextText}`;

            const result = await roche.ai.chat({
              messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "请连抽5个话题，用====分隔。" }],
              temperature: 0.9 
            });

            const rawTopics = result.text.split("====").map(t => t.trim().replace(/^["'「」]|["'「」]$/g, "")).filter(Boolean);
            rawTopics.forEach(topic => gachaData.unshift({ topic, date: Date.now() }));
            await roche.storage.set("blossom_gacha_data", gachaData);
            renderGacha();
            roche.ui.toast("已成功抽取 5 支新签");
          } catch (e) {
            roche.ui.toast("卜算失败: " + e.message);
          } finally {
            btn.textContent = "✦ 连抽五签 ✦"; btn.disabled = false;
          }
        };

        // --- 5. 日记模块逻辑 ---
        function getFeed() {
          if (!diaryFeed[activeConvId]) diaryFeed[activeConvId] = [];
          return diaryFeed[activeConvId];
        }

        async function saveFeed() {
          await roche.storage.set("blossom_diary_feed", diaryFeed);
          renderDiaryFeed();
        }

        function renderDiaryFeed() {
          const feed = getFeed();
          const html = feed.map(item => {
            const dateStr = new Date(item.date).toLocaleString();
            if (item.type === 'user') {
              return `
                <div class="bl-glass-panel bl-diary-box">
                  <div class="bl-diary-meta">我的手札 - ${dateStr}</div>
                  <div class="bl-diary-text">${item.content}</div>
                  ${item.reply ? `<div class="bl-diary-reply"><span style="color:#8e5c63;font-weight:bold;">他写道：</span>${item.reply}</div>` : ''}
                </div>`;
            } else {
              return `
                <div class="bl-glass-panel bl-diary-box" style="border-color: #a8bfb4;">
                  <div class="bl-diary-meta">他的手札 - ${dateStr}</div>
                  <div class="bl-diary-text">${item.content}</div>
                  ${item.comment ? `<div class="bl-diary-reply" style="border-color:#d7949b;"><span style="color:#b4757c;font-weight:bold;">我的评论：</span>${item.comment}</div>` : ''}
                  ${item.reply ? `<div class="bl-diary-reply" style="border-color:#a8bfb4; background: rgba(168,191,180,0.1);"><span style="color:#8e5c63;font-weight:bold;">他的回复：</span>${item.reply}</div>` : ''}
                </div>`;
            }
          }).join("");
          document.getElementById("bl-diary-feed").innerHTML = html || "<div style='text-align:center;color:#b4757c;font-size:13px;'>暂无羁绊记录...</div>";
        }

        async function getCharContext() {
          let persona = "";
          try {
            const convInfo = await roche.conversation.get(activeConvId);
            if (convInfo && convInfo.contactId) {
              const char = await roche.character.get(convInfo.contactId);
              persona = char.persona || char.bio || "";
            }
          } catch(e) {}
          const lt = await roche.memory.getLongTerm({ conversationId: activeConvId, limit: 20 });
          const facts = (lt.facts||[]).map(f => f.summaryText).join("\n");
          return { persona, facts };
        }

        // 模块A：我写日记，他来回复
        document.getElementById("bl-post-my-diary-btn").onclick = async () => {
          const content = document.getElementById("bl-my-diary-input").value.trim();
          if (!content) return roche.ui.toast("写点什么吧~");
          const btn = document.getElementById("bl-post-my-diary-btn");
          btn.textContent = "传书中..."; btn.disabled = true;

          try {
            const { persona, facts } = await getCharContext();
            const res = await roche.ai.chat({
              messages: [
                { role: "system", content: `你是用户互动的角色，以下是你的设定:\n${persona}\n\n长期共同记忆:\n${facts}\n\n用户在私密的手札/日记里写下了一段话。请你以角色的身份，用第一人称阅读并给出你的真实感受和回复。要符合性格。不要太长。` },
                { role: "user", content: `我的日记内容：\n${content}` }
              ],
              temperature: 0.8
            });

            getFeed().unshift({ type: 'user', content, reply: res.text, date: Date.now() });
            await saveFeed();
            document.getElementById("bl-my-diary-input").value = "";
            roche.ui.toast("他已阅并回复了你");
          } catch(e) {
            roche.ui.toast("出错了: " + e.message);
          } finally {
            btn.textContent = "落笔成信"; btn.disabled = false;
          }
        };

        // 模块B：他写日记，我来评论
        let tempCharDiary = "";
        document.getElementById("bl-gen-char-diary-btn").onclick = async () => {
          if (!activeConvId) return roche.ui.toast("请选择会话");
          const btn = document.getElementById("bl-gen-char-diary-btn");
          btn.textContent = "偷看中..."; btn.disabled = true;

          try {
            const { persona, facts } = await getCharContext();
            const st = await roche.memory.getShortTerm({ conversationId: activeConvId, limit: 15 });
            const recent = st.map(m => m.text).join("\n");

            const res = await roche.ai.chat({
              messages: [
                { role: "system", content: `你是用户互动的角色。设定:\n${persona}\n长期记忆:\n${facts}\n近期对话摘要:\n${recent}\n\n请你基于你们最近发生的事情或者你的感受，写一篇简短的个人日记。要求完全符合你的性格，用第一人称，可以是内心吐槽、情感抒发或是对最近事件的记录。不要过于正式，像真实的随笔。` },
                { role: "user", content: "请生成今天的日记。" }
              ],
              temperature: 0.8
            });

            tempCharDiary = res.text;
            document.getElementById("bl-char-diary-text").textContent = tempCharDiary;
            document.getElementById("bl-char-diary-display").style.display = "block";
            document.getElementById("bl-comment-area").style.display = "block";
            roche.ui.toast("已翻开他的手札");
          } catch(e) {
            roche.ui.toast("出错了: " + e.message);
          } finally {
            btn.textContent = "✦ 偷看他的日记 ✦"; btn.disabled = false;
          }
        };

        document.getElementById("bl-post-comment-btn").onclick = async () => {
          const comment = document.getElementById("bl-my-comment-input").value.trim();
          if (!comment) return roche.ui.toast("评论不能为空");
          const btn = document.getElementById("bl-post-comment-btn");
          btn.textContent = "发送中..."; btn.disabled = true;

          try {
            const { persona } = await getCharContext();
            const res = await roche.ai.chat({
              messages: [
                { role: "system", content: `设定:\n${persona}\n你写了这篇日记:\n${tempCharDiary}\n\n用户偷看了你的日记并写下了评论。请你以角色的性格，直接回复用户的这条评论。` },
                { role: "user", content: `我的评论：\n${comment}` }
              ],
              temperature: 0.8
            });

            getFeed().unshift({ type: 'char', content: tempCharDiary, comment, reply: res.text, date: Date.now() });
            await saveFeed();
            
            document.getElementById("bl-my-comment-input").value = "";
            document.getElementById("bl-char-diary-display").style.display = "none";
            document.getElementById("bl-comment-area").style.display = "none";
            tempCharDiary = "";
            roche.ui.toast("已完成羁绊互动");
          } catch(e) {
            roche.ui.toast("出错了: " + e.message);
          } finally {
            btn.textContent = "发送评论"; btn.disabled = false;
          }
        };

        await loadConversations();
      },
      
      async unmount(container, roche) {
        delete window._blCopy;
        delete window._blDel;
        const style = document.getElementById("blossom-style");
        if (style) style.remove();
        container.replaceChildren();
      }
    }
  ]
});
