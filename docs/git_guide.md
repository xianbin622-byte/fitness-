# Git 极简说明（照着做即可）

Git 就是：**在你电脑里给项目做「存档点」**，以后能恢复、能备份到网上（GitHub / Gitee）。

---

## 一、你只要记住的三条命令（日常）

在项目根目录 `fitness-coach-app` 里打开终端：

```bash
cd /Users/huangxianbin/fitness-coach-app
```

**1）看你改了啥**

```bash
git status
```

**2）把改动放进「待提交区」**

```bash
git add -A
```

**3）做一个存档点（提交）**

```bash
git commit -m "说明这次改了什么，例如：修复登录提示"
```

三步做完，改动就保存在 **本机 Git 历史**里了。

---

## 二、第一次：你的名字和邮箱（只做一次）

否则提交记录里作者显示不正规。在终端执行（把邮箱改成你自己的常用邮箱）：

```bash
cd /Users/huangxianbin/fitness-coach-app
git config user.name "你的名字"
git config user.email "你的邮箱@example.com"
```

说明：上面是 **只在这个项目里生效**。若你想所有项目统一，把 `git config` 改成 `git config --global`。

**本仓库已在本地执行**：`user.name=黄贤斌`、`user.email=huangxianbin@example.com`（示例邮箱）。请你改成真实邮箱：

```bash
cd /Users/huangxianbin/fitness-coach-app
git config user.email "你的真实邮箱@xxx.com"
```

---

## 三、备份到网上（GitHub 示例）

**必须你自己做**：在浏览器里注册/登录 GitHub，点 **New repository**，建一个 **空仓库**（不要勾选自动加 README）。

建好后，页面会给出仓库地址，类似：

`https://github.com/你的用户名/fitness-coach-app.git`

在终端执行（**把地址换成你的**）：

```bash
cd /Users/huangxianbin/fitness-coach-app
git remote add origin https://github.com/你的用户名/fitness-coach-app.git
git branch -M main
git push -u origin main
```

第一次 `push` 时，浏览器或终端会提示你登录 GitHub（或输入 Token）。**这一步我无法替你登录。**

若提示 `remote origin already exists`，说明已经加过远程，只想改地址：

```bash
git remote set-url origin https://github.com/你的用户名/fitness-coach-app.git
git push -u origin main
```

**Gitee** 同理：在 gitee.com 建空仓库，把上面的 `https://github.com/...` 换成 Gitee 给你的地址即可。

---

## 四、换电脑或重装后怎么拿代码

```bash
git clone https://github.com/你的用户名/fitness-coach-app.git
cd fitness-coach-app
```

---

## 五、常见情况

| 情况 | 命令 |
|------|------|
| 看提交历史 | `git log --oneline -10` |
| 撤销「还没 commit」的修改（危险，会丢改动） | `git checkout -- .` 或 `git restore .` |
| 只想撤销某一个文件 | `git restore 路径/文件名` |

---

## 六、不要提交的东西（已写在 .gitignore）

- `server/.env`（密钥）
- `node_modules`
- 本地数据库 `server/dev.db` 等

一般 **不要** 把 `.env` 推到公开仓库。

---

更细的教程可以网上搜「Git 入门」，但**日常开发只用到本文第一节的三条命令**就够了。
