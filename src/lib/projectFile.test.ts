import { describe, expect, it } from 'vitest'
import { createSampleStory } from './sampleStory'
import {
  PROJECT_FORMAT,
  buildProjectFileName,
  parseProjectJson,
  serializeProject,
} from './projectFile'

describe('project file round trip', () => {
  it('serializes and restores a complete story', () => {
    const sample = createSampleStory()
    const text = serializeProject(sample)
    const raw = JSON.parse(text)

    expect(raw.format).toBe(PROJECT_FORMAT)
    expect(raw.version).toBe(2)
    expect(raw.app).toBe('GalFlow')
    expect(raw.variables).toHaveLength(sample.variables.length)
    expect(raw.nodes).toHaveLength(sample.nodes.length)
    expect(raw.edges).toHaveLength(sample.edges.length)

    const restored = parseProjectJson(text)
    expect(restored.title).toBe(sample.title)
    expect(restored.variables).toHaveLength(sample.variables.length)
    expect(restored.nodes).toHaveLength(sample.nodes.length)
    expect(restored.edges).toHaveLength(sample.edges.length)
    expect(restored.nodes[0].data.title).toBe(sample.nodes[0].data.title)
    expect(restored.edges[0].source).toBe(sample.edges[0].source)
  })

  it('sanitizes imported rich text', () => {
    const raw = {
      format: PROJECT_FORMAT,
      version: 1,
      title: '安全测试',
      nodes: [
        {
          id: 'scene-1',
          type: 'scene',
          position: { x: 10, y: 20 },
          data: {
            kind: 'scene',
            title: '测试',
            fontSize: 20,
            content:
              '<p onclick="alert(1)">正常文本<script>alert(2)</script><img src=x onerror="alert(3)"></p>',
          },
        },
      ],
      edges: [],
    }

    const restored = parseProjectJson(JSON.stringify(raw))
    const node = restored.nodes[0]

    expect(node.type).toBe('scene')
    if (node.type !== 'scene') return

    expect(node.data.content).toContain('正常文本')
    expect(node.data.content).not.toContain('script')
    expect(node.data.content).not.toContain('onclick')
    expect(node.data.content).not.toContain('onerror')
    expect(node.data.fontSize).toBe(20)
    expect(node.position).toEqual({ x: 10, y: 20 })
  })

  it('adds a usable option when a choice node has no options', () => {
    const raw = {
      format: PROJECT_FORMAT,
      version: 1,
      title: '空选择',
      nodes: [
        {
          id: 'choice-1',
          type: 'choice',
          position: { x: 0, y: 0 },
          data: { kind: 'choice', title: '选择', options: [] },
        },
      ],
      edges: [],
    }

    const restored = parseProjectJson(JSON.stringify(raw))
    const node = restored.nodes[0]

    expect(node.type).toBe('choice')
    if (node.type !== 'choice') return
    expect(node.data.options).toHaveLength(1)
    expect(node.data.options[0].label).toBe('选项 A')
  })

  it('round-trips variables, effects and condition branches', () => {
    const raw = {
      format: PROJECT_FORMAT,
      version: 2,
      title: '变量测试',
      variables: [
        {
          id: 'v-affection',
          name: '好感度',
          kind: 'number',
          initialValue: 0,
          description: '女主好感',
        },
        {
          id: 'v-met',
          name: '见过她',
          kind: 'boolean',
          initialValue: false,
          description: '',
        },
      ],
      nodes: [
        {
          id: 'scene-1',
          type: 'scene',
          position: { x: 0, y: 0 },
          data: {
            kind: 'scene',
            title: '开始',
            content: '<p>开始</p>',
            fontSize: 18,
            effects: [
              {
                id: 'effect-1',
                variableId: 'v-affection',
                operation: 'add',
                value: 2,
              },
            ],
          },
        },
        {
          id: 'choice-1',
          type: 'choice',
          position: { x: 300, y: 0 },
          data: {
            kind: 'choice',
            title: '选择',
            options: [
              {
                id: 'option-1',
                label: '前进',
                effects: [
                  {
                    id: 'effect-2',
                    variableId: 'v-met',
                    operation: 'set',
                    value: true,
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'condition-1',
          type: 'condition',
          position: { x: 600, y: 0 },
          data: {
            kind: 'condition',
            title: '好感判断',
            cases: [
              {
                id: 'case-1',
                variableId: 'v-affection',
                operator: '>=',
                value: 3,
              },
            ],
          },
        },
        {
          id: 'scene-2',
          type: 'scene',
          position: { x: 900, y: 0 },
          data: {
            kind: 'scene',
            title: '结果',
            content: '',
            fontSize: 18,
            effects: [],
          },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'scene-1',
          target: 'choice-1',
          sourceHandle: 'out',
        },
        {
          id: 'edge-2',
          source: 'choice-1',
          target: 'condition-1',
          sourceHandle: 'option-1',
        },
        {
          id: 'edge-3',
          source: 'condition-1',
          target: 'scene-2',
          sourceHandle: 'case-1',
        },
        {
          id: 'edge-4',
          source: 'condition-1',
          target: 'scene-2',
          sourceHandle: 'else',
        },
      ],
    }

    const restored = parseProjectJson(JSON.stringify(raw))

    expect(restored.variables).toHaveLength(2)
    expect(restored.nodes).toHaveLength(4)

    const sceneNode = restored.nodes[0]
    expect(sceneNode.type).toBe('scene')
    if (sceneNode.type === 'scene') {
      expect(sceneNode.data.effects[0]).toMatchObject({
        variableId: 'v-affection',
        operation: 'add',
        value: 2,
      })
    }

    const choiceNode = restored.nodes[1]
    expect(choiceNode.type).toBe('choice')
    if (choiceNode.type === 'choice') {
      expect(choiceNode.data.options[0].effects[0]).toMatchObject({
        variableId: 'v-met',
        value: true,
      })
    }

    const conditionNode = restored.nodes[2]
    expect(conditionNode.type).toBe('condition')
    if (conditionNode.type === 'condition') {
      expect(conditionNode.data.cases[0]).toMatchObject({
        variableId: 'v-affection',
        operator: '>=',
        value: 3,
      })
    }

    expect(
      restored.edges.find((edge) => edge.id === 'edge-4')?.data
        ?.conditionCaseId,
    ).toBe('else')
  })

  it('rejects foreign or malformed files', () => {
    expect(() => parseProjectJson('not json')).toThrow('JSON')
    expect(() =>
      parseProjectJson(
        JSON.stringify({
          format: 'other-app',
          version: 1,
          nodes: [],
          edges: [],
        }),
      ),
    ).toThrow('GalFlow')
    expect(() =>
      parseProjectJson(
        JSON.stringify({ format: PROJECT_FORMAT, version: 999, nodes: [], edges: [] }),
      ),
    ).toThrow('版本过新')
  })

  it('rejects edges with missing endpoints', () => {
    const raw = {
      format: PROJECT_FORMAT,
      version: 1,
      title: '坏连线',
      nodes: [
        {
          id: 'scene-1',
          type: 'scene',
          position: { x: 0, y: 0 },
          data: { kind: 'scene', title: 'A', content: '', fontSize: 18 },
        },
      ],
      edges: [
        { id: 'edge-1', source: 'scene-1', target: 'missing', sourceHandle: 'out' },
      ],
    }

    expect(() => parseProjectJson(JSON.stringify(raw))).toThrow('不存在的节点')
  })
})

describe('buildProjectFileName', () => {
  it('removes Windows-invalid characters', () => {
    expect(buildProjectFileName('黄昏/来信: 第一稿?')).toBe(
      '黄昏来信_第一稿_GalFlow工程.galflow.json',
    )
  })
})
