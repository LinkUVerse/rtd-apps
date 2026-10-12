#!/usr/bin/env python3
"""Derive progress from Task.md; never turn partial or unverified work into completion."""
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import re
import json
import hashlib
import runpy

docs = Path(__file__).resolve().parents[1] / 'migrationToGRpcOrGraphQLDoc'
tasks = re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)` (.*)$', (docs/'Task.md').read_text(), re.M)
if not tasks or len({task[1] for task in tasks}) != len(tasks):
    raise SystemExit('Task.md empty or duplicate IDs')
groups = {}
for mark, task_id, _ in tasks:
    group = task_id.split('-')[0]
    done, total = groups.get(group, (0, 0))
    groups[group] = (done + (mark == 'x'), total + 1)
done = sum(mark == 'x' for mark, _, _ in tasks)
now = datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S %z')
text = f'''# 钱包迁移总进度

更新时间：{now}（北京时间）。计算来源：[Task.md](./Task.md)；本文件由 scripts/update-migration-progress.py 更新。

总体：**{done}/{len(tasks)} 项完成（{done/len(tasks):.1%}）**。文档与代码／运行验收分别计数；总体比例不能当作接口迁移率或可试用证明。

'''
fine_file = docs / 'remainingAcceptanceProgress.json'
fine_remaining = None
if fine_file.exists():
    fine = json.loads(fine_file.read_text())
    marks = {task_id: mark for mark, task_id, _ in tasks}
    if fine['totalOriginalParents'] != len(tasks) or fine['baselineCompletedParents'] + fine['baselineRemainingParents'] != len(tasks):
        raise SystemExit('细分进度基线与原父清单不一致')
    if len(fine['parents']) != fine['baselineRemainingParents'] or len({p['parentId'] for p in fine['parents']}) != len(fine['parents']):
        raise SystemExit('细分进度父项重复或缺失')
    accepted_units = 0
    for parent in fine['parents']:
        if parent['parentId'] not in marks or sum(c['weight'] for c in parent['criteria']) != 100:
            raise SystemExit('细分进度父项或权重无效')
        for criterion in parent['criteria']:
            if type(criterion['accepted']) is not bool or not 0 < criterion['weight'] <= 100:
                raise SystemExit('细分验收状态无效')
            if not criterion['accepted']:
                continue
            if not criterion['evidence']:
                raise SystemExit('细分验收不得缺少实际证据')
            for evidence in criterion['evidence']:
                data = Path(evidence['path']).read_bytes()
                if hashlib.sha256(data).hexdigest() != evidence['sha256']:
                    raise SystemExit('细分验收证据SHA发生变化')
                proof = json.loads(data)
                if proof.get('passed') is not True or proof.get('preparedOnly') is True:
                    raise SystemExit('准备证明或失败不得计业务验收')
                if any(proof.get(k) != v for k, v in evidence['required'].items()):
                    raise SystemExit('细分验收证明未满足必需事实')
            accepted_units += criterion['weight'] / 100
        if marks[parent['parentId']] == 'x' and not all(c['accepted'] for c in parent['criteria']):
            raise SystemExit('父项不得先于完整细分验收收口')
    fine_remaining = (fine['baselineRemainingParents'] - accepted_units) / len(tasks) * 100
    text += f'\n细分验收剩余：**{fine_remaining:.2f}%**（原98父项等权，开放父项内按剩余必需验收包计数）；细分已完成：**{100-fine_remaining:.2f}%**。父项仍按上方清单完整收口。计算合同：[细分计量](./workLog/20261008-granular-progress-measurement.md)。\n\n'
five_file = docs / 'remainingFiveWorkPackages.json'
if five_file.exists():
    five = json.loads(five_file.read_text())
    if {p['id'] for p in five['parents']} != {'QA-A15', 'QA-A17', 'QA-A20', 'REL-02', 'REL-05'} or len(five['parents']) != 5:
        raise SystemExit('最后五项盘点范围不符')
    items = [item for parent in five['parents'] for item in parent['items']]
    if len({item['id'] for item in items}) != len(items) or any(item['status'] not in {'done', 'blocked', 'partial', 'in_progress', 'pending'} for item in items):
        raise SystemExit('最后五项子包状态或ID无效')
    five_done = sum(item['status'] == 'done' for item in items)
    five_open = len(items) - five_done
    if (len(items), five_done, five_open) != (five['totalPackages'], five['completedPackages'], five['openPackages']):
        raise SystemExit('最后五项子包汇总与明细不一致')
    if abs(five['remainingPackagePercent'] - 100 * five_open / len(items)) > 1e-9 or five['originalCompletedParents'] != done:
        raise SystemExit('机器清单派生比例或父项完成数与实际明细不一致')
    if five['parentCompletion'] != (done == len(tasks)):
        raise SystemExit('机器清单最终完成标志与原父项清单不一致')
    for parent in five['parents']:
        count = sum(item['status'] == 'done' for item in parent['items'])
        if (len(parent['items']), count, len(parent['items'])-count) != (parent['total'], parent['completed'], parent['remaining']):
            raise SystemExit('最后五项父项汇总与明细不一致')
    runpy.run_path(str(Path(__file__).with_name('render-left-progress.py')))['render'](docs)
    text += '\n持续更新的剩余工作量：[leftProgress.md](./leftProgress.md)。每个子包收口即更新，父项全部通过后再勾选原清单。\n'
    text += f'\n最后五项内部盘点：**{five_done}/{len(items)} 个验收子包完成，{five_open} 个未收口，剩余 {five_open/len(items):.0%}**。这是五项内部的子包等权口径，不是工时或整个项目的剩余比例；部分完成不算完整通过，原98父项不据此改勾。上述旧分组口径尚不能反映这些大包内部进度。[逐项范围与慢因](./workLog/20261011-C271-five-parent-breakdown.md)、[当前机器清单](./remainingFiveWorkPackages.json)。\n\n'
text += '| 阶段 | 已完成／总项 | 进度 |\n| --- | --- | --- |\n'
labels = {'DOC':'方案与基准', 'NET':'网络与数据层基础', 'RPC':'全部接口编码与页面接入', 'TX':'签名授权与持久恢复', 'ENV':'指定 dev 环境与浏览器协议', 'TRY':'核心测试与可试用交付', 'QA':'试用期间真实回归', 'REL':'发布清理与完整验收'}
for group, (count,total) in groups.items():
    text += f'| {labels[group]} | {count}/{total} | {count/total:.1%} |\n'
trial_ready = all(mark == 'x' for mark, task_id, _ in tasks if task_id.split('-')[0] in ('RPC','TX','TRY'))
task_marks = {task_id: mark for mark, task_id, _ in tasks}
# A completed signing matrix does not supply ordinary Chrome permission/TLS evidence.
trial_ready = trial_ready and all(task_marks.get(task_id) == 'x' for task_id in ('ENV-07', 'QA-A19'))
text += f'\n可试用门槛：**{"已通过 TRY 清单，仍须按日志核实环境与安装说明" if trial_ready else "尚未达到"}**。所有接口、签名恢复及核心真实链／Chrome 证据必须成立；不能以定向单测替代。\n'
replay_file = docs/'workLog/current-C139-replay-progress.json'
if replay_file.exists():
    replay = json.loads(replay_file.read_text())
    if replay.get('passed') is True and replay.get('progressOnly') is True:
        if replay['range'] != [0, 709569] or replay['totalCheckpointCount'] != 709570:
            raise SystemExit('C139即时回放范围不符')
        watermarks = replay['watermarks']
        if set(watermarks) != {'sql','hbase','consistent'} or [len(watermarks[k]) for k in ['sql','hbase','consistent']] != [23,14,4]:
            raise SystemExit('C139即时水位集合不完整')
        values = [v for group in watermarks.values() for v in group.values()]
        if not all(type(v) is int and 0 <= v <= 709569 for v in values):
            raise SystemExit('C139即时水位非法')
        minimum = min(values)
        if replay['all41MinimumCheckpoint'] != minimum or replay['coveredCheckpointCount'] != minimum+1 or replay['fullRangeReplayAccepted'] is not False or replay['parentCompletion'] is not False:
            raise SystemExit('C139即时进度不得冒充验收')
        replay_accepted = docs/'workLog/20261012-C295-complete-replay-01.json'
        comparison_accepted = docs/'workLog/20261012-C348-full-data-comparison-01.json'
        packages = {item['id']: item['status'] for p in five['parents'] for item in p['items']}
        if packages.get('QA-A17.4') == 'done' and packages.get('QA-A17.5') == 'done':
            r = json.loads(replay_accepted.read_text()); c = json.loads(comparison_accepted.read_text())
            assert r['passed'] and r['fixedRangeReplayAccepted'] and r['allPersistedWatermarksAtFinalCheckpoint']
            assert c['passed'] and c['completeDataComparisonAccepted'] and c['threeAccountBusinessResultsEqual']
            text += '\n完整查询重放及数据比较：**原0..709569全部完成**。41条持久管线和SQL/HBase/Rocks、完整账户事实及三账户查询均已核验；归档/WAL和最终交付状态仍按独立子包计算。证据：[完整重放](./workLog/20261012-C295-complete-replay-01.json)、[全数据比较](./workLog/20261012-C348-full-data-comparison-01.json)。\n'
        else:
            text += f'\n完整查询重放数据进度：**{(minimum+1)/709570:.2%}**（{minimum+1:,}/709,570；41条管线最低checkpoint={minimum:,}）。观测时间：{replay["observedAt"]}。这是只读水位进度，完整验收按独立子包计算。来源：[即时只读状态](./workLog/current-C139-replay-progress.json)。\n'
    else:
        text += '\n完整查询重放观察已停止或失败，须核对[即时只读状态](./workLog/current-C139-replay-progress.json)；不自动重启消费者或勾选验收。\n'
state = docs/'workLog/current-state.md'
if state.exists():
    def rebase_state_link(match):
        path, marker, fragment = match.group(1).partition('#')
        relative = os.path.relpath((state.parent/path).resolve(), docs)
        return '](' + './' + relative + marker + fragment + ')'
    state_text = re.sub(r'\]\((\.\.?/[^)]*)\)', rebase_state_link, state.read_text())
    text += '\n'+state_text.strip()+'\n'
text += '\n只有完成清单、规定验证与证据均成立才勾选。主人试用期间继续 QA；全部必需项最终审计通过后才结束目标。\n'
progress_file = docs/'totalProgress.md'
temporary = progress_file.with_name('.'+progress_file.name+'.'+str(os.getpid()))
try:
    with temporary.open('x') as stream:
        stream.write(text)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, progress_file)
finally:
    if temporary.exists():
        temporary.unlink()
print(f'{done}/{len(tasks)} ({done/len(tasks):.1%}); trial_ready={trial_ready}')
if fine_remaining is not None:
    print(f'细分验收剩余={fine_remaining:.2f}%')
