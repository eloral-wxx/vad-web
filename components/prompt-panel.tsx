"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface PromptPanelProps {
  anomalyPrompt: string
  onAnomalyPromptChange: (value: string) => void
  className?: string
}

const PROMPT_TEMPLATES = [
  {
    label: "商超门店场景",
    value: `请帮我检测商超、便利店、收银区等零售场景中的异常事件：
1. 抢劫：嫌疑人以持械威胁、肢体威胁、强行索要现金或逼迫店员打开收银台等方式实施暴力夺取财物。
2. 盗窃：人员趁他人不注意将商品、现金或随身物品偷偷拿走、藏匿或带离现场。
3. 打架斗殴：两人或多人出现明显推搡、挥拳、踢打、追打或肢体冲突。
4. 破坏公物：故意打砸货架、门窗、柜台、监控、车辆或其他公共设施。
5. 明火：画面中出现持续燃烧的火焰、明显烟火或可见燃烧物。
6. 人员跌倒：顾客或员工因滑倒、绊倒、失衡等原因突然倒地，需要与正常坐下、蹲下区分开。`,
  },
  {
    label: "道路交通场景",
    value: `请帮我检测道路、路口、停车场或高架桥监控中的异常事件：
1. 交通事故：车辆碰撞、追尾、侧翻、失控冲出道路或撞击护栏、行人、非机动车。
2. 车辆起火：车辆出现持续明火、冒烟、燃烧或局部火势蔓延。
3. 爆炸：车辆或路面发生瞬时爆燃、强冲击、碎片飞散或剧烈烟尘扩散。
4. 逆行或危险驾驶：车辆明显逆向行驶、突然急转、蛇形穿行、异常高速冲撞。
5. 行人闯入车道：行人长时间停留、横穿或跌落在机动车道内，存在明显危险。
6. 道路拥堵或异常聚集：车辆大面积滞留、异常排队，或事故后人群在道路中央聚集。`,
  },
  {
    label: "社区园区场景",
    value: `请帮我检测小区、园区、楼宇出入口、广场等公共监控场景中的异常事件：
1. 非法闯入：人员翻越围栏、强行进入限制区域、破门进入或夜间异常潜入。
2. 徘徊逗留：人员长时间在门口、围墙、停车区附近反复走动、观察或停留。
3. 打架斗殴：多人之间发生明显推搡、追逐、殴打或激烈冲突。
4. 摔倒或昏厥：人员突然倒地、长时间不起身，需与弯腰、蹲下、休息区分。
5. 高空抛物或物体坠落：楼上物体突然坠落、飞出或砸向地面、车辆、行人。
6. 明火或烟雾：公共区域出现持续火焰、浓烟、燃烧物或明显起火迹象。`,
  },
  {
    label: "工地厂区场景",
    value: `请帮我检测工地、仓库、厂房、生产车间等场景中的异常事件：
1. 人员跌倒：工人因滑倒、踩空、失衡或碰撞而突然倒地。
2. 物体坠落：高处材料、工具、构件或设备突然掉落、滑落或砸落。
3. 设备冒烟或起火：机器、电柜、管线、仓储区域出现持续烟雾、火焰或燃烧。
4. 爆炸：出现瞬时强光、冲击波、结构碎裂、碎片飞散或大范围烟尘扩散。
5. 危险区域闯入：人员进入施工禁区、设备作业区、吊装区或封闭区域。
6. 聚集性冲突或追逐：多人出现明显争执、推搡、追赶或暴力冲突。`,
  },
  {
    label: "校园医院场景",
    value: `请帮我检测校园、医院、办公楼大厅、电梯厅等室内公共场景中的异常事件：
1. 人员跌倒或昏厥：人员突然倒地、瘫倒、长时间不起身，需要和坐下、弯腰区分。
2. 打架冲突：出现推搡、追逐、挥打、踢打、围堵等明显冲突行为。
3. 盗窃或抢夺：趁人不备拿走包裹、手机、背包，或直接抢走他人物品后逃离。
4. 破坏设施：故意打砸门禁、电梯按钮、玻璃、桌椅、仪器或公告设施。
5. 异常聚集：短时间内人群快速围拢、拥堵、骚乱或伴随慌乱逃散。
6. 烟火异常：走廊、大厅、电梯口等区域出现可见明火、浓烟或燃烧痕迹。`,
  },
  {
    label: "水域灾害场景",
    value: `请帮我检测河道、海边、港口、堤坝、景区或灾害监控场景中的异常事件：
1. 落水：人员或车辆跌入河道、池塘、海边或其他水域。
2. 溺水挣扎：人员在水中持续扑腾、挣扎、沉浮异常，存在明显遇险迹象。
3. 洪水或内涝：大量积水快速蔓延、道路被淹、湍流冲刷或水位明显上涨。
4. 海浪冲击或海啸：大浪异常涌入岸边、迅速吞没道路、车辆、建筑或人群区域。
5. 滑坡塌方：山体、堤岸、边坡大面积垮塌，伴随泥土、石块快速下滑。
6. 疏散逃离：人群因突发危险集中奔跑、撤离、逆向拥挤或明显恐慌。`,
  },
]

export function PromptPanel({
  anomalyPrompt,
  onAnomalyPromptChange,
  className,
}: PromptPanelProps) {
  return (
    <div className={cn("h-full", className)}>
      <div className="glass-panel neon-border flex h-full min-h-0 flex-col overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20">
              <span className="text-xs font-bold text-primary">A</span>
            </div>
            <h3 className="text-sm font-medium text-foreground">定义异常</h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-border/50 bg-input/40 hover:border-primary/50 hover:bg-primary/10"
              >
                模板
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {PROMPT_TEMPLATES.map((template) => (
                <DropdownMenuItem
                  key={template.label}
                  onClick={() => onAnomalyPromptChange(template.value)}
                >
                  {template.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden pb-2 pr-1">
          <Textarea
            value={anomalyPrompt}
            onChange={(e) => onAnomalyPromptChange(e.target.value)}
            placeholder="输入你希望检测的异常类别，或直接选择上方中文场景模板..."
            className="cyber-scroll h-full min-h-[128px] max-h-full resize-none overflow-y-auto border-border/50 bg-input/50 px-3 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/85 focus:border-primary/50"
          />
        </div>
      </div>
    </div>
  )
}
