"use client"

import { Compass, LayoutDashboard, Move3d, Ruler } from "lucide-react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { use, useMemo, useState } from "react"
import useSWR from "swr"

import { PropertyHighlights } from "@/components/skymap/dashboard/property-highlights"
import { PropertyRooms } from "@/components/skymap/dashboard/property-rooms"
import { PropertySpecifications } from "@/components/skymap/dashboard/property-specifications"
import { RoomSelector } from "@/components/skymap/dashboard/room-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/skymap/ui/tabs"
import { fetcher, getPropertyDimensions, getPropertyTour, getPropertyVastu } from "@/lib/skymap/api"
import type { Property, PropertyDimensions, PropertyShare, PropertyTour, VastuReportData } from "@/lib/skymap/types"

const PanoramaViewer = dynamic(
  () => import("@/components/skymap/dashboard/panorama-viewer").then((m) => m.PanoramaViewer),
  { ssr: false, loading: () => <div className="glass flex aspect-video items-center justify-center rounded-3xl text-sm text-muted-foreground">Loading 360 viewer...</div> }
)
const VastuReport = dynamic(() => import("@/components/skymap/dashboard/vastu-report").then((m) => m.VastuReport), { ssr: false })
const DimensionsView = dynamic(() => import("@/components/skymap/dashboard/dimensions-view").then((m) => m.DimensionsView), { ssr: false })

export default function SharedPropertyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const { data: share, error: shareError, isLoading: shareLoading } = useSWR<PropertyShare>(`/api/skymap/share/${token}`, fetcher)
  const visibility = share?.visibility
  const propertyId = share?.propertyId

  const { data: property } = useSWR<Property>(propertyId ? `/api/skymap/property/${propertyId}` : null, fetcher)
  const { data: tour, isLoading: tourLoading } = useSWR<PropertyTour>(
    propertyId && visibility?.sections.tour360 ? `/api/skymap/property/${propertyId}/tour` : null,
    () => getPropertyTour(propertyId!)
  )
  const { data: vastu, isLoading: vastuLoading } = useSWR<VastuReportData>(
    propertyId && visibility?.sections.vastu ? `/api/skymap/property/${propertyId}/vastu` : null,
    () => getPropertyVastu(propertyId!)
  )
  const { data: dimensions, isLoading: dimensionsLoading } = useSWR<PropertyDimensions>(
    propertyId && visibility?.sections.dimensions ? `/api/skymap/property/${propertyId}/dimensions` : null,
    () => getPropertyDimensions(propertyId!)
  )

  const tabs = useMemo(() => {
    if (!visibility) return []
    return [
      visibility.sections.overview ? "overview" : null,
      visibility.sections.tour360 ? "tour360" : null,
      visibility.sections.vastu ? "vastu" : null,
      visibility.sections.dimensions ? "dimensions" : null,
    ].filter(Boolean) as string[]
  }, [visibility])

  const [activeRoomIndex, setActiveRoomIndex] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")
  const selectedTab = tabs.includes(activeTab) ? activeTab : tabs[0]

  const visibleRooms = property?.rooms?.filter((room) => visibility?.roomIds.includes(room.id)) || []
  const visibleRoomNames = new Set(visibleRooms.map((room) => room.name))
  const visibleTourScenes = tour?.scenes.filter((scene) => visibleRoomNames.has(scene.room)) || []
  const visibleDimensionRooms = dimensions?.rooms.filter((room) => visibleRoomNames.has(room.name)) || []

  function openTourForRoom(roomName: string) {
    const idx = visibleTourScenes.findIndex((scene) => scene.room === roomName)
    if (idx >= 0) setActiveRoomIndex(idx)
    setActiveTab("tour360")
  }

  function openDimensionsForRoom(roomName: string) {
    const idx = visibleDimensionRooms.findIndex((room) => room.name === roomName)
    if (idx >= 0) setActiveRoomIndex(idx)
    setActiveTab("dimensions")
  }

  if (shareLoading) {
    return <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Loading shared property...</div>
  }

  if (shareError || !share || !visibility) {
    return (
      <div className="grid min-h-svh place-items-center px-6 text-center">
        <div>
          <p className="text-xl font-medium">This link isn&apos;t available</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            It may have been revoked, expired, or the link is incorrect. Contact the person who shared it with you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh px-5 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link href="/platforms/skymap" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Move3d className="size-4" />
            </span>
            SkyMap
          </Link>
          <p className="text-xs text-muted-foreground">Shared by {share.senderName}</p>
        </div>

        <div>
          <p className="eyebrow">Property presentation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{share.propertyName}</h1>
          {property && <p className="mt-2 text-muted-foreground">{property.location} · {property.sizeSqft.toLocaleString()} sq ft</p>}
          {share.message && <p className="mt-4 max-w-2xl rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">&ldquo;{share.message}&rdquo;</p>}
        </div>

        {tabs.length > 0 && selectedTab && (
          <Tabs orientation="vertical" value={selectedTab} onValueChange={(value) => setActiveTab(value as string)} className="flex-col sm:flex-row">
            <TabsList className="w-full shrink-0 sm:w-52">
              {visibility.sections.overview && <TabsTrigger value="overview"><LayoutDashboard data-icon="inline-start" /> Overview</TabsTrigger>}
              {visibility.sections.tour360 && <TabsTrigger value="tour360"><Move3d data-icon="inline-start" /> 360 Tour</TabsTrigger>}
              {visibility.sections.vastu && <TabsTrigger value="vastu"><Compass data-icon="inline-start" /> Vastu Report</TabsTrigger>}
              {visibility.sections.dimensions && <TabsTrigger value="dimensions"><Ruler data-icon="inline-start" /> Dimensions</TabsTrigger>}
            </TabsList>

            {visibility.sections.overview && (
              <TabsContent value="overview" className="mt-6 min-w-0 flex-1 sm:mt-0 sm:pl-8">
                {property ? (
                  <div className="flex flex-col gap-6">
                    <div className="glass overflow-hidden rounded-3xl">
                      <div className="relative aspect-video">
                        <Image src={property.coverImage} alt={property.name} fill className="object-cover" sizes="100vw" priority />
                      </div>
                    </div>
                    {property.highlights && <PropertyHighlights highlights={property.highlights} visibleHighlightIds={visibility.highlightIds} />}
                    {property.rooms && <PropertyRooms rooms={property.rooms} visibleRoomIds={visibility.roomIds} onOpenTour={openTourForRoom} onOpenDimensions={openDimensionsForRoom} />}
                    {property.specifications && <PropertySpecifications specs={property.specifications} visibleSpecFields={visibility.specFields} visibleAmenities={visibility.amenities} />}
                  </div>
                ) : (
                  <div className="glass h-64 animate-pulse rounded-3xl" />
                )}
              </TabsContent>
            )}

            {visibility.sections.tour360 && (
              <TabsContent value="tour360" className="mt-6 min-w-0 flex-1 sm:mt-0 sm:pl-8">
                {tourLoading ? (
                  <div className="glass flex aspect-video items-center justify-center rounded-3xl text-sm text-muted-foreground">Loading tour...</div>
                ) : visibleTourScenes.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    <PanoramaViewer scenes={visibleTourScenes} activeIndex={Math.min(activeRoomIndex, visibleTourScenes.length - 1)} onChangeIndex={setActiveRoomIndex} />
                    <RoomSelector rooms={visibleTourScenes.map((s) => s.room)} activeIndex={Math.min(activeRoomIndex, visibleTourScenes.length - 1)} onSelect={setActiveRoomIndex} />
                  </div>
                ) : null}
              </TabsContent>
            )}

            {visibility.sections.vastu && (
              <TabsContent value="vastu" className="mt-6 min-w-0 flex-1 sm:mt-0 sm:pl-8">
                {vastuLoading ? <div className="glass h-64 animate-pulse rounded-3xl" /> : vastu ? <VastuReport data={vastu} /> : null}
              </TabsContent>
            )}

            {visibility.sections.dimensions && (
              <TabsContent value="dimensions" className="mt-6 min-w-0 flex-1 sm:mt-0 sm:pl-8">
                {dimensionsLoading ? (
                  <div className="glass h-64 animate-pulse rounded-3xl" />
                ) : visibleDimensionRooms.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    <RoomSelector
                      rooms={visibleDimensionRooms.map((r) => r.name)}
                      activeIndex={Math.min(activeRoomIndex, visibleDimensionRooms.length - 1)}
                      onSelect={setActiveRoomIndex}
                    />
                    <DimensionsView room={visibleDimensionRooms[Math.min(activeRoomIndex, visibleDimensionRooms.length - 1)]} />
                  </div>
                ) : null}
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  )
}
