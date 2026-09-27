<script setup lang="ts">
import { ref } from 'vue'
import { ACCOUNTS, useSessionStore } from '../stores/session'

const session = useSessionStore()
const username = ref('parent')
const password = ref('123456')
const error = ref('')

function login() {
  error.value = session.login(username.value.trim(), password.value) ?? ''
}

function quick(u: string) {
  username.value = u
  password.value = '123456'
  login()
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-card card">
      <div class="hero">
        <div class="logo">🌱</div>
        <h1>邻里童物交换日</h1>
        <p>社区亲子旧物交换活动 · 报名撮合与现场核销平台</p>
        <ul class="flow-demo">
          <li>提交报名 → 社区审核 → 智能撮合 → 预约摊位</li>
          <li>扫码到场 → 三项核验 → 交换 / 自由区</li>
          <li>异常多方协同 → 交换成功 / 转捐 / 带回 / 缺席全程留痕</li>
        </ul>
      </div>

      <div class="login-form">
        <h2 style="font-size: 16px; margin-bottom: 14px">登录（演示环境）</h2>
        <div class="stack">
          <div class="field">
            <label>账号</label>
            <input v-model="username" class="input" placeholder="parent / staff / volunteer / charity" @keyup.enter="login" />
          </div>
          <div class="field">
            <label>密码</label>
            <input v-model="password" type="password" class="input" placeholder="统一演示密码 123456" @keyup.enter="login" />
          </div>
          <div v-if="error" class="error-text">{{ error }}</div>
          <button class="btn primary" style="justify-content: center; padding: 10px" @click="login">
            进入平台
          </button>
        </div>

        <div class="quick-title">或选择角色一键体验（密码均为 123456）</div>
        <div class="quick-grid">
          <button v-for="a in ACCOUNTS" :key="a.username" class="quick-btn" @click="quick(a.username)">
            <strong>{{ a.name }}</strong>
            <span>{{ a.hint }}</span>
            <span class="hint">账号 {{ a.username }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 18px;
  background:
    radial-gradient(900px 400px at 10% -10%, #d7ecdf 0%, transparent 60%),
    radial-gradient(700px 380px at 110% 110%, #e7efe6 0%, transparent 55%),
    var(--bg);
}
.login-card {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  max-width: 900px;
  width: 100%;
  overflow: hidden;
}
.hero {
  background: linear-gradient(160deg, #2c7a51, #245c40);
  color: #eaf5ee;
  padding: 38px 32px;
}
.logo { font-size: 42px; }
.hero h1 { font-size: 24px; margin: 10px 0 6px; color: #fff; }
.hero p { margin: 0 0 18px; color: #b9d6c5; font-size: 13.5px; }
.flow-demo {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 2.1;
  color: #d4e8db;
}
.login-form { padding: 32px; }
.quick-title {
  margin: 20px 0 10px;
  font-size: 12.5px;
  color: var(--ink-3);
}
.quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}
.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  padding: 9px 11px;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.quick-btn:hover {
  border-color: var(--brand);
  background: var(--brand-soft);
}
.quick-btn strong { font-size: 13.5px; }
.quick-btn span { font-size: 12px; color: var(--ink-2); }
@media (max-width: 760px) {
  .login-card { grid-template-columns: 1fr; }
}
</style>
