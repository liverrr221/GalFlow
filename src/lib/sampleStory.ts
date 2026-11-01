import { MarkerType } from '@xyflow/react'
import type {
  StoryEdge,
  StoryNode,
  StorySnapshot,
  StoryVariable,
} from '../types/story'

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
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: '#b9a9a0',
    },
  }
}

export function createSampleStory(): StorySnapshot {
  const variables: StoryVariable[] = [
    {
      id: 'sample-var-affection',
      name: '好感度',
      kind: 'number',
      initialValue: 0,
      description: '女主对男主的好感度',
    },
    {
      id: 'sample-var-bookmark',
      name: '收下书签',
      kind: 'boolean',
      initialValue: false,
      description: '是否收下了她递来的书签',
    },
  ]

  const nodes: StoryNode[] = [
    {
      id: 'sample-scene-1',
      type: 'scene',
      position: { x: 40, y: 240 },
      data: {
        kind: 'scene',
        title: '放学后的走廊',
        fontSize: 18,
        effects: [],
        content:
          '<p>夕阳把走廊染成蜂蜜色。你把最后一本书塞进书包，抬头时，看见她站在窗边，像是在等一个迟迟没有开口的理由。</p><p>“今天……要一起走吗？”她问得很轻，指尖绕着书包带。</p>',
      },
    },
    {
      id: 'sample-choice-1',
      type: 'choice',
      position: { x: 410, y: 150 },
      data: {
        kind: 'choice',
        title: '要一起绕远路吗？',
        options: [
          {
            id: 'sample-option-1',
            label: '一起绕远路回家',
            effects: [
              {
                id: 'sample-effect-1',
                variableId: 'sample-var-affection',
                operation: 'add',
                value: 1,
              },
              {
                id: 'sample-effect-2',
                variableId: 'sample-var-bookmark',
                operation: 'set',
                value: true,
              },
            ],
          },
          {
            id: 'sample-option-2',
            label: '借口先走一步',
            effects: [
              {
                id: 'sample-effect-3',
                variableId: 'sample-var-affection',
                operation: 'subtract',
                value: 1,
              },
            ],
          },
        ],
      },
    },
    {
      id: 'sample-scene-2',
      type: 'scene',
      position: { x: 840, y: 40 },
      data: {
        kind: 'scene',
        title: '绕远路的黄昏',
        fontSize: 18,
        effects: [],
        content:
          '<p>你们没有走平时那条近路，而是沿着河堤慢慢往前。她把耳机分给你一边，里面放着一首没有歌词的钢琴曲。</p><p>风把她的声音吹得很近：“其实，我每天都会在这里多绕一圈。”</p>',
      },
    },
    {
      id: 'sample-scene-3',
      type: 'scene',
      position: { x: 840, y: 380 },
      data: {
        kind: 'scene',
        title: '一个人的站台',
        fontSize: 18,
        effects: [],
        content:
          '<p>你找了个不算高明的借口，先一步走出校门。站台上的风有些凉，列车进站的声音盖过了手机震动。</p><p>屏幕亮起，是她发来的一条消息：“明天见。”</p>',
      },
    },
    {
      id: 'sample-scene-4',
      type: 'scene',
      position: { x: 1220, y: 210 },
      data: {
        kind: 'scene',
        title: '未寄出的短信',
        fontSize: 18,
        effects: [],
        content:
          '<p>夜里，你盯着输入框看了很久。删掉，重写，再删掉。最后只剩下窗外路灯落在天花板上的光斑。</p><p>有些话像黄昏一样，明明已经看见了，却还是来不及抓住。</p>',
      },
    },
  ]

  const edges: StoryEdge[] = [
    edge('sample-edge-1', 'sample-scene-1', 'sample-choice-1'),
    edge(
      'sample-edge-2',
      'sample-choice-1',
      'sample-scene-2',
      'sample-option-1',
      '一起绕远路回家',
    ),
    edge(
      'sample-edge-3',
      'sample-choice-1',
      'sample-scene-3',
      'sample-option-2',
      '借口先走一步',
    ),
    edge('sample-edge-4', 'sample-scene-2', 'sample-scene-4'),
    edge('sample-edge-5', 'sample-scene-3', 'sample-scene-4'),
  ]

  return { title: '黄昏来信', variables, nodes, edges }
}
