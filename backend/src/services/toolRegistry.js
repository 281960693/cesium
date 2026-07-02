/**
 * toolRegistry - 工具注册表（后端）
 *
 * 定义所有可用的 GIS 工具及其 JSON Schema
 * 用于生成 System Prompt 并发送给大模型
 */

/**
 * 工具注册表
 */
export const toolDefinitions = [
  {
    name: 'search_poi',
    description: '根据关键词搜索附近的兴趣点（POI），如餐厅、医院、学校等。返回 POI 列表，包含名称、地址、距离等信息。',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: '搜索关键词，如"医院"、"餐厅"、"学校"、"超市"等'
        },
        location: {
          type: 'object',
          properties: {
            longitude: { type: 'number', description: '经度（WGS84 坐标系）' },
            latitude: { type: 'number', description: '纬度（WGS84 坐标系）' }
          },
          description: '搜索中心点坐标。如果用户没有提供，可以省略，系统会使用当前地图中心点。'
        },
        radius: {
          type: 'number',
          description: '搜索半径（单位：米）。默认值 1000，最大值 5000。'
        }
      },
      required: ['keyword']
    }
  },
  {
    name: 'fly_to_location',
    description: '控制地图视角平滑飞行到指定的地理坐标。用于在查询结果返回后，自动将地图定位到目标位置。',
    parameters: {
      type: 'object',
      properties: {
        longitude: {
          type: 'number',
          description: '目标经度（WGS84 坐标系）'
        },
        latitude: {
          type: 'number',
          description: '目标纬度（WGS84 坐标系）'
        },
        height: {
          type: 'number',
          description: '飞行高度（单位：米）。默认值 1000。值越小，视角越近；值越大，视角越广。'
        }
      },
      required: ['longitude', 'latitude']
    }
  },
  {
    name: 'draw_marker',
    description: '在地图上的指定位置绘制一个标记点。标记点会显示名称标签，点击可查看详情。',
    parameters: {
      type: 'object',
      properties: {
        longitude: {
          type: 'number',
          description: '标记点经度（WGS84 坐标系）'
        },
        latitude: {
          type: 'number',
          description: '标记点纬度（WGS84 坐标系）'
        },
        name: {
          type: 'string',
          description: '标记点名称，会显示在标签上'
        },
        description: {
          type: 'string',
          description: '标记点详细描述（可选）'
        }
      },
      required: ['longitude', 'latitude', 'name']
    }
  },
  {
    name: 'draw_circle',
    description: '在地图上绘制一个半透明的圆形区域。常用于表示搜索范围、服务范围等。',
    parameters: {
      type: 'object',
      properties: {
        longitude: {
          type: 'number',
          description: '圆心经度（WGS84 坐标系）'
        },
        latitude: {
          type: 'number',
          description: '圆心纬度（WGS84 坐标系）'
        },
        radius: {
          type: 'number',
          description: '圆的半径（单位：米）'
        },
        color: {
          type: 'string',
          description: '圆形颜色（十六进制格式），如 "#4a90e2"。默认蓝色。'
        }
      },
      required: ['longitude', 'latitude', 'radius']
    }
  },
  {
    name: 'clear_all',
    description: '清除地图上所有已绘制的标记和图形。用于重置地图状态。',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
]

/**
 * 生成 System Prompt
 */
export function generateSystemPrompt(currentLocation = '') {
  const toolDescriptions = toolDefinitions.map(tool => {
    return `- ${tool.name}: ${tool.description}`
  }).join('\n')

  const locationContext = currentLocation
    ? `\n\n用户当前位置: ${currentLocation}`
    : ''

  return `# 角色定义
你是 WebGIS 智能助手，一个专业的空间数据分析专家。你可以帮助用户在 3D 地图上查询、分析和可视化地理信息。

# 工作原则
1. 深度思考：在回答或调用工具之前，你必须使用英文标签 <thinking> 和 </thinking> 包裹输出你的思考过程。在思考过程中，分析用户的意图、所需的地理空间操作步骤、经纬度坐标处理逻辑等。
2. 结构顺序：每次回复的固定格式为：
   <thinking>
   你的深度思考和推理分析过程
   </thinking>
   你的自然语言回答内容（或加上用于调用操作的 JSON 代码块）

# 能力范围
你可以执行以下操作：
${toolDescriptions}

# 工作原则
1. 理解用户意图：仔细分析用户的需求，确定需要执行哪些操作
2. 选择合适工具：根据用户需求选择最合适的工具
3. 生成正确参数：确保工具参数符合 JSON Schema 定义
4. 用自然语言回复：用清晰、友好的语言向用户解释你的操作
5. 处理错误情况：如果工具执行失败，告诉用户原因并建议解决方案

# 输出格式
对于用户可见的内容，使用自然语言。
对于需要执行的操作，输出以下 JSON 格式：
\`\`\`json
{
  "type": "tool_call",
  "name": "工具名称",
  "arguments": { ... }
}
\`\`\`

# 示例对话

用户: 查询附近的医院
助手: 
<thinking>
用户需要查询附近的医院。
1. 需要调用的工具是 search_poi。
2. 搜索关键字是 "医院"。
3. 参数应该包括 keyword: "医院"。
4. 接下来将产生相应的 JSON 指令。
</thinking>
我来帮你查询附近的医院。

\`\`\`json
{
  "type": "tool_call",
  "name": "search_poi",
  "arguments": {
    "keyword": "医院"
  }
}
\`\`\`

查询完成！我找到了 5 家医院，并已在地图上标记。你可以点击标记查看详情。
${locationContext}

# 注意事项
- 如果用户没有提供位置信息，可以使用地图中心点作为默认位置
- 对于搜索结果，建议同时调用 fly_to_location 将地图定位到合适位置
- 如果搜索结果为空，建议扩大搜索范围或更换关键词`
}

/**
 * 获取 OpenAI 格式的工具定义
 */
export function getOpenAITools() {
  return toolDefinitions.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))
}

export default {
  toolDefinitions,
  generateSystemPrompt,
  getOpenAITools
}
