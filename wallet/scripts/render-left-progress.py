#!/usr/bin/env python3
"""Render the remaining acceptance ledger without treating partial proof as done."""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path


def render(docs):
    ledger = json.loads((docs / 'remainingFiveWorkPackages.json').read_text())
    parents = ledger['parents']
    items = [item for parent in parents for item in parent['items']]
    completed = sum(item['status'] == 'done' for item in items)
    remaining = len(items) - completed
    now = datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S %z')
    lines = [
        '# 剩余工作量', '', f'更新时间：{now}（北京时间）。', '',
        f'最后五项内部：**{completed}/{len(items)} 个子包完成；{remaining} 个未收口；剩余 {remaining/len(items):.1%}**。', '',
        f'本轮原有27个未收口子包：**已完成 {27-remaining} 个；仍有 {remaining} 个；剩余 {remaining/27:.1%}**。此口径固定原基线，不因拆分或重排改变分母。', '',
        '基线为 C271 的 45 个子包，其中 18 个已完成、27 个未收口。子包等权统计，'
        '不是工时估算；部分完成仍保留为未收口。每个子包的“验收剩余”采用 0%／100% 二值：'
        '0% 表示该包全部必需条件及证据成立，100% 表示尚未完整收口，不代表内部毫无进展。'
        '真实数据回放百分比单独记录，不能替代业务验收。', '',
        '唯一状态源为 [子包清单](./remainingFiveWorkPackages.json)。每完成一个子包，更新其状态、'
        '证据和清单汇总，再执行 `python3 scripts/update-migration-progress.py`，同时生成本文及'
        '[总体进度](./totalProgress.md)。父项只有完整通过才更新 [Task.md](./Task.md) 和细分验收依据。', '',
        '## 五项剩余比例', '',
        '| 父项 | 完成／总数 | 未收口 | 内部剩余 |',
        '| --- | ---: | ---: | ---: |',
    ]
    for parent in parents:
        done = sum(item['status'] == 'done' for item in parent['items'])
        total = len(parent['items'])
        lines.append(f"| {parent['id']} {parent['title']} | {done}/{total} | {total-done} | {(total-done)/total:.1%} |")
    lines += [
        '', '## 当前瓶颈与执行顺序' if remaining else '## 历史基线与收口状态', '',
        'C271 现场基线：发布水位 1,006,768，待发布上界 1,482,841；新质押和 NFT 转移分别位于 '
        '1,988,842／2,001,906。固定重放范围 0..709569 的 41 条持久管线最低为 458,532，'
        '数据覆盖 64.62%。这些是有时间边界的观测，当前状态以最新工作日志为准。', '',
        '1. 原G3范围0..709569的41条管线重放、全数据与三账户比对已经通过；存储/WAL状态按下方独立子包记录。' if remaining else '1. 原0..709569全部重放、完整持久数据/WAL和归档重建已通过。',
        '2. 当前Chrome实际换H0、同H0后端generation换代和迟到结果矩阵已通过；其余恢复条件按下方独立子包记录。' if remaining else '2. 当前Chrome完整换代、迟到结果、保留数据与仅归档恢复均已通过。',
        '3. 文档语义与逐RPC/页面追溯已通过；运行核对、临时清理及98项/A01–A22终验按下方独立子包记录。' if remaining else '3. 逐文档/RPC/页面、98项/A01–A22、当前运行和临时资源清理完整通过。', '',
        '2026-10-11 主人已授权必要时重置本任务 dev 链及归档索引。重置前核实范围并保留原钱包账户、'
        '待定交易 journal 和必要故障证据；若确认是 rtd／rtd-archive-service 逻辑缺陷，必须修复相应源码。'
        '不能用清库掩盖缺陷，也不能把较小新环境的通过记录冒充原 0..709569 全量回放完成。'
        '环境启动和合约部署使用 link-u-smart-contract 的脚本，RTD 服务使用指定仓库最新源码 debug 产物。', '',
        '原分析与慢因：[C271 盘点](./workLog/20261011-C271-five-parent-breakdown.md)。'
        '后续实施：[C272 工作日志](./workLog/20261011-C272-left-progress-and-environment.md)。',
    ]
    if ledger.get('currentWork'):
        lines += ['', '最新实施状态：', '']
        lines += ['- ' + entry for entry in ledger['currentWork']]
    labels = {'done': '完成', 'blocked': '依赖未满足', 'partial': '部分完成',
              'in_progress': '进行中', 'pending': '待执行'}
    for parent in parents:
        lines += ['', f"## {parent['id']} {parent['title']}", '',
                  '| 子包 | 验收内容 | 状态 | 验收剩余 | 证据／待办 |',
                  '| --- | --- | --- | ---: | --- |']
        for item in parent['items']:
            basis = item['basis']
            if basis.startswith(('./', '../')):
                target = (docs / 'workLog' / basis).resolve()
                if not target.is_file():
                    raise ValueError(f"missing evidence for {item['id']}: {target}")
                basis = f'[证据](./{os.path.relpath(target, docs)})'
            basis = basis.replace('|', '\\|').replace('\n', ' ')
            lines.append(f"| {item['id']} | {item['title']} | {labels[item['status']]} | "
                         f"{0 if item['status'] == 'done' else 100}% | {basis} |")
    lines += ['', '## 更新记录', '',
              '- C271：建立 45 个子包基线，18 完成／27 未收口；原父项 93/98。',
              '- C272：创建本文件并纳入统一进度生成，记录已授权的 dev 重置及源码修复边界。', '']
    for event in ledger.get('completionHistory', []):
        lines.insert(-1, f"- {event['at']}：{event['id']} 收口；{event['summary']}")
    target = docs / 'leftProgress.md'
    temporary = target.with_name(f'.{target.name}.{os.getpid()}')
    try:
        temporary.write_text('\n'.join(lines))
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == '__main__':
    render(Path(__file__).resolve().parents[1] / 'migrationToGRpcOrGraphQLDoc')
