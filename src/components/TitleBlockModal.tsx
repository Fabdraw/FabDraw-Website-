import React from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import type { TitleBlock } from '../types'

export default function TitleBlockModal() {
  const { titleBlock, updateTitleBlock } = useProjectStore()
  const { setShowTitleBlockModal } = useUIStore()
  const { register, handleSubmit } = useForm<TitleBlock>({ defaultValues: titleBlock })

  const onSubmit = (data: TitleBlock) => {
    updateTitleBlock(data)
    setShowTitleBlockModal(false)
  }

  const inp = "w-full rounded px-2 py-1.5 text-sm text-white outline-none focus:border-orange-500/50 transition-colors"
  const inpStyle = {background:'#1f2937',border:'1px solid rgba(255,255,255,0.1)'}
  const lbl = "text-xs text-slate-500 mb-1 block"

  const fields: {key: keyof TitleBlock, label: string}[] = [
    {key:'company',label:'Company'},
    {key:'project',label:'Project Name'},
    {key:'description',label:'Description'},
    {key:'address',label:'Address'},
    {key:'phone',label:'Phone'},
    {key:'web',label:'Website'},
    {key:'drawnBy',label:'Drawn By'},
    {key:'checkedBy',label:'Checked By'},
    {key:'date',label:'Date'},
    {key:'scale',label:'Scale'},
    {key:'dwgNo',label:'Drawing No.'},
    {key:'revision',label:'Revision'},
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="relative flex flex-col rounded-xl overflow-hidden" style={{width:'540px',maxHeight:'90vh',background:'#111827',border:'1px solid rgba(255,255,255,0.1)'}}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.08)'}}>
          <div>
            <div className="font-semibold text-white">Title Block</div>
            <div className="text-xs text-slate-500 mt-0.5">Drawing information and metadata</div>
          </div>
          <button onClick={()=>setShowTitleBlockModal(false)} className="p-2 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all"><X size={16}/></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-4">
              {fields.map(f => (
                <div key={f.key}>
                  <label className={lbl}>{f.label}</label>
                  <input {...register(f.key)} className={inp} style={inpStyle} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 p-4 border-t" style={{borderColor:'rgba(255,255,255,0.08)'}}>
            <button type="button" onClick={()=>setShowTitleBlockModal(false)}
              className="flex-1 py-2 rounded text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all border" style={{borderColor:'rgba(255,255,255,0.1)'}}>
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2 rounded text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{background:'#f97316'}}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
