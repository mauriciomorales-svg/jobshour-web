'use client'

import dynamic from 'next/dynamic'
import type { ExpertDetail } from './HomeWorkerDetailSheet'
import type { AuthUser } from '@/hooks/useUserAuth'

const ServiceRequestModal = dynamic(() => import('@/app/components/ServiceRequestModal'), { ssr: false }) as any
const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false })
const MisSolicitudes = dynamic(() => import('./MisSolicitudes'), { ssr: false })
const ChatHistory = dynamic(() => import('./ChatHistory'), { ssr: false })

type ChatCtx = {
  description?: string
  name?: string
  avatar?: string | null
  myRole?: 'cliente' | 'trabajador'
  isSelf?: boolean
}

interface HomeChatPanelsProps {
  showSolicitudesPanel: boolean
  user: AuthUser | null
  onLoginRequest: () => void
  onCloseSolicitudes: () => void
  onOpenChatFromSolicitudes: (
    requestId: number,
    otherName: string,
    otherAvatar: string | null,
    myRole: 'cliente' | 'trabajador' | undefined,
    isSelf: boolean | undefined
  ) => void
  showRequestModal: boolean
  selectedDetail: ExpertDetail | null
  onCloseRequestModal: () => void
  onRequestComplete: (reqId: number) => void
  showChat: boolean
  activeRequestId: number | null
  chatContext: ChatCtx
  currentUserId: number
  onCloseChat: () => void
  showChatHistory: boolean
  onCloseChatHistory: () => void
  onOpenChatFromHistory: (requestId: number, ctx: ChatCtx) => void
}

export function HomeChatPanels({
  showSolicitudesPanel,
  user,
  onLoginRequest,
  onCloseSolicitudes,
  onOpenChatFromSolicitudes,
  showRequestModal,
  selectedDetail,
  onCloseRequestModal,
  onRequestComplete,
  showChat,
  activeRequestId,
  chatContext,
  currentUserId,
  onCloseChat,
  showChatHistory,
  onCloseChatHistory,
  onOpenChatFromHistory,
}: HomeChatPanelsProps) {
  return (
    <>
      {showSolicitudesPanel && (
        <div className="fixed inset-0 z-[150]">
          <MisSolicitudes
            user={user}
            onLoginRequest={onLoginRequest}
            onClose={onCloseSolicitudes}
            onOpenChat={onOpenChatFromSolicitudes}
          />
        </div>
      )}

      {showRequestModal && selectedDetail && (
        <ServiceRequestModal
          expert={{
            id: selectedDetail.id,
            name: selectedDetail.name,
            avatar: selectedDetail.avatar,
            hourly_rate: selectedDetail.hourly_rate,
            category: selectedDetail.category
              ? { name: selectedDetail.category.name, color: selectedDetail.category.color, icon: selectedDetail.category.icon }
              : null,
            pos: selectedDetail.pos,
            active_route: selectedDetail.active_route || null,
          }}
          currentUser={user}
          onClose={onCloseRequestModal}
          onSent={(reqId: number) => onRequestComplete(reqId)}
        />
      )}

      {showChat && activeRequestId && (
        <ChatPanel
          requestId={activeRequestId}
          myRole={chatContext.myRole}
          isSelf={chatContext.isSelf}
          currentUserId={currentUserId}
          onClose={onCloseChat}
          requestDescription={chatContext.description}
          otherPersonName={chatContext.name}
          otherPersonAvatar={chatContext.avatar}
        />
      )}

      {showChatHistory && (
        <ChatHistory onClose={onCloseChatHistory} onOpenChat={onOpenChatFromHistory} />
      )}
    </>
  )
}
