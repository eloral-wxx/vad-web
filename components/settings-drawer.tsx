"use client"

import { useState } from "react"
import { Settings, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { InferenceConfig } from "@/lib/types"

interface SettingsDrawerProps {
  config: InferenceConfig
  onConfigChange: (config: InferenceConfig) => void
}

export function SettingsDrawer({ config, onConfigChange }: SettingsDrawerProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const handleChange = (key: keyof InferenceConfig, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      onConfigChange({ ...config, [key]: numValue })
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-panel border-l border-border/50 bg-background/95 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            推理配置
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-8 space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              基础设置
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="fps" className="text-sm text-foreground">
                FPS (帧率)
              </Label>
              <Input
                id="fps"
                type="number"
                value={config.fps}
                onChange={(e) => handleChange("fps", e.target.value)}
                className="bg-input/50 border-border/50 focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                视频采样帧率
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="windowGop" className="text-sm text-foreground">
                Window GOP
              </Label>
              <Input
                id="windowGop"
                type="number"
                value={config.windowGop}
                onChange={(e) => handleChange("windowGop", e.target.value)}
                className="bg-input/50 border-border/50 focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                滑动窗口大小
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="overlapGop" className="text-sm text-foreground">
                Overlap GOP
              </Label>
              <Input
                id="overlapGop"
                type="number"
                value={config.overlapGop}
                onChange={(e) => handleChange("overlapGop", e.target.value)}
                className="bg-input/50 border-border/50 focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                窗口重叠大小
              </p>
            </div>
          </div>
          
          {/* Advanced Settings */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-0 hover:bg-transparent"
              >
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  高级设置
                </span>
                {isAdvancedOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="blockGop" className="text-sm text-foreground">
                  Block GOP
                </Label>
                <Input
                  id="blockGop"
                  type="number"
                  value={config.blockGop || 0}
                  onChange={(e) => handleChange("blockGop", e.target.value)}
                  className="bg-input/50 border-border/50 focus:border-primary/50"
                />
                <p className="text-xs text-muted-foreground">
                  块处理大小
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tokenCompression" className="text-sm text-foreground">
                  Token Compression
                </Label>
                <Input
                  id="tokenCompression"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={config.tokenCompression || 0.5}
                  onChange={(e) => handleChange("tokenCompression", e.target.value)}
                  className="bg-input/50 border-border/50 focus:border-primary/50"
                />
                <p className="text-xs text-muted-foreground">
                  Token压缩比率 (0-1)
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  )
}
