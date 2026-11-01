import { describe, expect, it } from 'vitest'
import { buildStoryText, buildTextFileName } from './exportStory'
import type { StoryEdge, StoryNode } from '../types/story'

function scene(
  id: string,
  title: string,
  content = '<p>正文</p>',
  x = 0,
  y = 0,
): StoryNode {
  return {
    id,
    type: 'scene',
    position: { x, y },
    data: { kind: 'scene', title, content, fontSize: 18, effects: [] },
  }
}

function choice(
  id: string,
  title: string,
  options: { id: string; label: string }[],
  x = 0,
  y = 0,
): StoryNode {
  return {
    id,
    type: 'choice',
    position: { x, y },
    data: {
      kind: 'choice',
      title,
      options: options.map((option) => ({ ...option, effects: [] })),
    },
  }
}

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  optionLabel?: string,
): StoryEdge {
  return {
    id,
    source,
    target,
    sourceHandle,
    type: 'story',
    data: { optionId: sourceHandle, optionLabel },
  }
}

const generatedAt = new Date('2026-05-20T10:30:00')

describe('buildStoryText', () => {
  it('builds a structured outline, branch labels and node bodies', () => {
    const nodes = [
      scene('s1', '开始', '<p>故事从这里开始。</p>'),
      choice('c1', '要怎么做？', [
        { id: 'o1', label: '向左走' },
        { id: 'o2', label: '向右走' },
      ]),
      scene('s2', '左侧', '<p>左边有一座桥。</p>'),
      scene('s3', '右侧', '<p>右边有一片森林。</p>'),
      scene('s4', '汇合', '<p>最终你们还是相遇了。</p>'),
    ]
    const edges = [
      edge('e1', 's1', 'c1'),
      edge('e2', 'c1', 's2', 'o1', '向左走'),
      edge('e3', 'c1', 's3', 'o2', '向右走'),
      edge('e4', 's2', 's4'),
      edge('e5', 's3', 's4'),
    ]

    const text = buildStoryText({
      title: '测试故事',
      nodes,
      edges,
      generatedAt,
    })

    expect(text).toContain('《测试故事》')
    expect(text).toContain('一、剧情流程')
    expect(text).toContain('二、场景、选项与条件正文')
    expect(text).toContain('三、结局与待补全')
    expect(text).toContain('◆ 起点：场景 1《开始》')
    expect(text).toContain('选择 1《要怎么做？》')
    expect(text).toContain('A. 向左走')
    expect(text).toContain('B. 向右走')
    expect(text).toContain('场景 2《左侧》')
    expect(text).toContain('场景 3《右侧》')
    expect(text).toContain('场景 4《汇合》')
    expect(text).toContain('↪ 汇合处')
    expect(text).toContain('【场景 1】开始')
    expect(text).toContain('故事从这里开始。')
    expect(text).toContain('A. 向左走 → 场景 2《左侧》')
    expect(text).toContain('↳ 下一步：场景 4《汇合》')
    expect(text).toContain('结局 1 个：场景 4《汇合》')
  })

  it('marks unconnected options and endings', () => {
    const nodes = [
      scene('s1', '抉择之前'),
      choice('c1', '留下还是离开？', [
        { id: 'o1', label: '留下' },
        { id: 'o2', label: '离开' },
      ]),
      scene('s2', '留下之后'),
    ]
    const edges = [
      edge('e1', 's1', 'c1'),
      edge('e2', 'c1', 's2', 'o1', '留下'),
    ]

    const text = buildStoryText({ title: '未完成', nodes, edges, generatedAt })

    expect(text).toContain('B. 离开')
    expect(text).toContain('→ （未连接）')
    expect(text).toContain('待连接的选项：')
    expect(text).toContain('选择 1《留下还是离开？》 → B. 离开')
    expect(text).toContain('结局 1 个')
  })

  it('survives a graph with no in-degree-zero starting node', () => {
    const nodes = [
      scene('s1', '循环 A'),
      scene('s2', '循环 B'),
    ]
    const edges = [
      edge('e1', 's1', 's2'),
      edge('e2', 's2', 's1'),
    ]

    const text = buildStoryText({ title: '循环', nodes, edges, generatedAt })

    expect(text).toContain('未找到明确的起点')
    expect(text).toContain('↻ 循环至此')
  })

  it('exports variable definitions, effects and condition branches', () => {
    const variables = [
      {
        id: 'v-affection',
        name: '好感度',
        kind: 'number' as const,
        initialValue: 0,
        description: '女主对男主的好感度',
      },
    ]

    const start = scene('s1', '开场')
    if (start.type === 'scene') {
      start.data.effects = [
        {
          id: 'e-start',
          variableId: 'v-affection',
          operation: 'add',
          value: 1,
        },
      ]
    }

    const choiceNode = choice('c1', '如何回应？', [
      { id: 'o1', label: '微笑' },
    ])
    if (choiceNode.type === 'choice') {
      choiceNode.data.options[0].effects = [
        {
          id: 'e-choice',
          variableId: 'v-affection',
          operation: 'add',
          value: 1,
        },
      ]
    }

    const condition: StoryNode = {
      id: 'cond1',
      type: 'condition',
      position: { x: 700, y: 0 },
      data: {
        kind: 'condition',
        title: '好感分支',
        cases: [
          {
            id: 'case-1',
            variableId: 'v-affection',
            operator: '>=',
            value: 2,
          },
        ],
      },
    }

    const nodes: StoryNode[] = [
      start,
      choiceNode,
      condition,
      scene('s2', '好结局'),
      scene('s3', '普通结局'),
    ]
    const edges: StoryEdge[] = [
      edge('e1', 's1', 'c1'),
      edge('e2', 'c1', 'cond1', 'o1', '微笑'),
      edge('e3', 'cond1', 's2', 'case-1'),
      edge('e4', 'cond1', 's3', 'else'),
    ]

    const text = buildStoryText({
      title: '变量故事',
      variables,
      nodes,
      edges,
      generatedAt,
    })

    expect(text).toContain('变量设定')
    expect(text).toContain('好感度（数值，初始值 0）')
    expect(text).toContain('好感度 +1')
    expect(text).toContain('微笑')
    expect(text).toContain('好感度 ≥ 2')
    expect(text).toContain('否则')
    expect(text).toContain('场景 2《好结局》')
    expect(text).toContain('场景 3《普通结局》')
    expect(text).toContain('判断顺序：')
    expect(text).toContain('条件节点 1 个')
  })

  it('lists the main component before isolated nodes, even if they are leftmost', () => {
    const nodes = [
      scene('s1', '主线开始', '', 400, 200),
      scene('s2', '主线继续', '', 700, 200),
      choice('c1', '未连接选择', [{ id: 'o1', label: '尚未安排' }], 0, 200),
    ]
    const edges = [edge('e1', 's1', 's2')]

    const text = buildStoryText({ title: '排序', nodes, edges, generatedAt })

    expect(text.indexOf('◆ 起点 1：场景 1《主线开始》')).toBeLessThan(
      text.indexOf('◆ 起点 2：选择 1《未连接选择》'),
    )
  })

  it('handles an empty canvas without inventing content', () => {
    const text = buildStoryText({
      title: '',
      nodes: [],
      edges: [],
      generatedAt,
    })

    expect(text).toContain('《未命名剧情》')
    expect(text).toContain('画布中还没有剧情节点')
    expect(text).toContain('（暂无内容）')
  })
})

describe('buildTextFileName', () => {
  it('removes characters that Windows does not allow in file names', () => {
    expect(buildTextFileName('黄昏/来信: 第一稿?')).toBe(
      '黄昏来信_第一稿_剧情流程.txt',
    )
  })

  it('falls back to a default name', () => {
    expect(buildTextFileName('   ')).toBe('未命名剧情_剧情流程.txt')
  })
})
