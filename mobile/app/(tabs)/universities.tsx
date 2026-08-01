import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
  StatusBar,
  RefreshControl,
  Linking,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface UniversitySummary {
  id: number;
  name: string;
  region: string;
  type: string;
  code: string;
  description?: string;
  totalCapacity?: number;
  keyFacts?: { established?: number; students?: number; programs?: number };
}

interface Program {
  id: number;
  name: string;
  code: string;
  description?: string;
  intakeCapacity?: number;
  admissionTracks?: { id: number; name: string; intakeCapacity: number }[];
}

interface UniversityDetail extends UniversitySummary {
  address?: string;
  history?: string;
  achievements?: string;
  facilities?: string;
  researchAreas?: string;
  studentLife?: string;
  accreditation?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  admissionInstructions?: string;
  applicationStartDate?: string;
  applicationDeadline?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function applicationStatus(start?: string, deadline?: string): { label: string; color: string; bg: string } {
  const now = new Date();
  if (start) {
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    if (now < s) return { label: '⏳ Applications Not Yet Open', color: '#1d4ed8', bg: '#dbeafe' };
  }
  if (deadline) {
    const d = new Date(deadline);
    d.setHours(23, 59, 59, 999);
    if (now > d) return { label: '❌ Applications Closed', color: '#b91c1c', bg: '#fee2e2' };
  }
  return { label: '✅ Applications Open', color: '#166534', bg: '#dcfce7' };
}

function splitLines(text?: string): string[] {
  if (!text) return [];
  return text.split('\n').map(l => l.replace(/^•\s*/, '').trim()).filter(Boolean);
}

// ── Section Components ───────────────────────────────────────────────────────

const SectionHeader = ({ icon, title, color }: { icon: string; title: string; color?: string }) => (
  <View style={s.sectionHeaderRow}>
    <Text style={s.sectionIcon}>{icon}</Text>
    <Text style={[s.sectionTitle, color ? { color } : {}]}>{title}</Text>
  </View>
);

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{String(value)}</Text>
    </View>
  );
};

const BulletList = ({ items }: { items: string[] }) => (
  <View style={{ gap: 6 }}>
    {items.map((item, i) => (
      <View key={i} style={s.bulletRow}>
        <Text style={s.bullet}>•</Text>
        <Text style={s.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

const TagList = ({ items }: { items: string[] }) => (
  <View style={s.tagWrap}>
    {items.map((item, i) => (
      <View key={i} style={s.tag}>
        <Text style={s.tagText}>{item}</Text>
      </View>
    ))}
  </View>
);

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function UniversitiesScreen() {
  const { token } = useAuth();

  // List state
  const [universities, setUniversities] = useState<UniversitySummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Profile modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<UniversityDetail | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<number>>(new Set());

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchUniversities = useCallback(async () => {
    if (!token) return;
    try {
      setListLoading(true);
      setListError(null);
      const result = await apiClient.getUniversities(token);
      if (result.success && result.data?.universities) {
        setUniversities(result.data.universities);
      } else {
        setListError(result.message || 'Failed to load universities');
      }
    } catch (e: any) {
      setListError(e.message || 'An error occurred');
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchUniversities(); }, [fetchUniversities]);

  const onRefresh = () => { setRefreshing(true); fetchUniversities(); };

  // ── Open profile modal ─────────────────────────────────────────────────────
  const openProfile = async (uni: UniversitySummary) => {
    setSelectedDetail(null);
    setPrograms([]);
    setExpandedPrograms(new Set());
    setModalVisible(true);
    setProfileLoading(true);

    if (!token) return;

    // Fetch full detail + programs in parallel
    const [detailRes, progsRes] = await Promise.all([
      apiClient.getUniversityById(token, uni.id),
      apiClient.getUniversityPrograms(token, uni.id),
    ]);

    if (detailRes.success && detailRes.university) {
      setSelectedDetail(detailRes.university as UniversityDetail);
    } else {
      // Fallback to summary data
      setSelectedDetail(uni as UniversityDetail);
    }
    if (progsRes.success) {
      setPrograms(progsRes.programs || []);
    }
    setProfileLoading(false);
  };

  const toggleProgram = (id: number) => {
    setExpandedPrograms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredUniversities = universities.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Render helpers ─────────────────────────────────────────────────────────
  const d = selectedDetail;

  const appStatus = d ? applicationStatus(d.applicationStartDate, d.applicationDeadline) : null;
  const achievements = splitLines(d?.achievements);
  const facilities = splitLines(d?.facilities);
  const researchAreas = splitLines(d?.researchAreas);
  const studentLife = splitLines(d?.studentLife);
  const accreditation = splitLines(d?.accreditation);

  // ── List screen ────────────────────────────────────────────────────────────
  if (listLoading && !refreshing) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1d4ed8" />
        <View style={s.header}>
          <Text style={s.headerTitle}>Universities</Text>
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text style={s.loadingText}>Loading universities…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (listError) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1d4ed8" />
        <View style={s.header}>
          <Text style={s.headerTitle}>Universities</Text>
        </View>
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>⚠️</Text>
          <Text style={s.errorTitle}>Failed to Load</Text>
          <Text style={s.errorMsg}>{listError}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchUniversities}>
            <Text style={s.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1d4ed8" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Universities</Text>
        <Text style={s.headerSub}>{filteredUniversities.length} institution{filteredUniversities.length !== 1 ? 's' : ''}</Text>
        <View style={s.searchBox}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search universities…"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1d4ed8']} />}
      >
        {filteredUniversities.length === 0 ? (
          <View style={s.center}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🎓</Text>
            <Text style={s.emptyText}>No universities found</Text>
          </View>
        ) : (
          filteredUniversities.map(uni => (
            <View key={uni.id} style={s.card}>
              {/* Badge */}
              <View style={[s.typeBadge, uni.type === 'public' ? s.badgePublic : s.badgeOther]}>
                <Text style={s.badgeText}>{uni.type?.toUpperCase() || 'PUBLIC'}</Text>
              </View>

              <Text style={s.cardName}>{uni.name}</Text>
              <Text style={s.cardMeta}>📍 {uni.region || 'Unknown Region'}  •  🏫 Code: {uni.code}</Text>

              {uni.description ? (
                <Text style={s.cardDesc} numberOfLines={2}>{uni.description}</Text>
              ) : null}

              <View style={s.cardFooter}>
                {uni.totalCapacity ? (
                  <Text style={s.cardStat}>👥 Capacity: {uni.totalCapacity.toLocaleString()}</Text>
                ) : null}
                {uni.keyFacts?.established ? (
                  <Text style={s.cardStat}>📅 Est. {uni.keyFacts.established}</Text>
                ) : null}
              </View>

              <TouchableOpacity style={s.viewProfileBtn} onPress={() => openProfile(uni)}>
                <Text style={s.viewProfileBtnText}>View Full Profile →</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Full Profile Modal ─────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={s.modal}>
          {/* Modal Header Bar */}
          <View style={s.modalTopBar}>
            <TouchableOpacity style={s.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={s.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {profileLoading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#1d4ed8" />
              <Text style={s.loadingText}>Loading profile…</Text>
            </View>
          ) : d ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>

              {/* ── Hero ────────────────────────────────────────────────── */}
              <View style={s.hero}>
                <Text style={s.heroName}>{d.name}</Text>
                <View style={s.heroBadgeRow}>
                  <View style={s.heroBadge}><Text style={s.heroBadgeText}>🏛 {d.type || 'University'}</Text></View>
                  <View style={s.heroBadge}><Text style={s.heroBadgeText}>📍 {d.region}</Text></View>
                  {d.code ? <View style={s.heroBadge}><Text style={s.heroBadgeText}>🎓 {d.code}</Text></View> : null}
                </View>
              </View>

              {/* ── Key Facts ───────────────────────────────────────────── */}
              {(d.keyFacts?.established || d.keyFacts?.students || d.keyFacts?.programs || d.totalCapacity) && (
                <View style={s.factsRow}>
                  {d.keyFacts?.established ? (
                    <View style={s.factBox}>
                      <Text style={s.factNum}>{d.keyFacts.established}</Text>
                      <Text style={s.factLabel}>Established</Text>
                    </View>
                  ) : null}
                  {d.keyFacts?.students ? (
                    <View style={s.factBox}>
                      <Text style={s.factNum}>{d.keyFacts.students.toLocaleString()}+</Text>
                      <Text style={s.factLabel}>Students</Text>
                    </View>
                  ) : null}
                  {d.keyFacts?.programs ? (
                    <View style={s.factBox}>
                      <Text style={s.factNum}>{d.keyFacts.programs}+</Text>
                      <Text style={s.factLabel}>Programs</Text>
                    </View>
                  ) : null}
                  {d.totalCapacity ? (
                    <View style={s.factBox}>
                      <Text style={s.factNum}>{d.totalCapacity.toLocaleString()}</Text>
                      <Text style={s.factLabel}>Capacity</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* ── Application Period ───────────────────────────────────── */}
              {(d.applicationStartDate || d.applicationDeadline) && appStatus && (
                <View style={s.section}>
                  <SectionHeader icon="📅" title="Application Period" color="#1d4ed8" />
                  <View style={s.appDateRow}>
                    <View style={[s.appDateBox, { borderColor: '#93c5fd' }]}>
                      <Text style={s.appDateLabel}>🟢 Opens</Text>
                      <Text style={s.appDateVal}>{fmtDate(d.applicationStartDate) || 'Not set'}</Text>
                    </View>
                    <View style={[s.appDateBox, { borderColor: '#fbbf24' }]}>
                      <Text style={s.appDateLabel}>🔴 Deadline</Text>
                      <Text style={s.appDateVal}>{fmtDate(d.applicationDeadline) || 'Not set'}</Text>
                    </View>
                  </View>
                  <View style={[s.statusBanner, { backgroundColor: appStatus.bg }]}>
                    <Text style={[s.statusText, { color: appStatus.color }]}>{appStatus.label}</Text>
                  </View>
                </View>
              )}

              {/* ── About ───────────────────────────────────────────────── */}
              {d.description ? (
                <View style={s.section}>
                  <SectionHeader icon="✨" title="About the University" />
                  <Text style={s.bodyText}>{d.description}</Text>
                </View>
              ) : null}

              {/* ── History ─────────────────────────────────────────────── */}
              {d.history ? (
                <View style={s.section}>
                  <SectionHeader icon="🕐" title="History & Background" color="#16a34a" />
                  <Text style={s.bodyText}>{d.history}</Text>
                </View>
              ) : null}

              {/* ── Achievements ────────────────────────────────────────── */}
              {achievements.length > 0 && (
                <View style={s.section}>
                  <SectionHeader icon="🏆" title="Achievements & Recognition" color="#d97706" />
                  <BulletList items={achievements} />
                </View>
              )}

              {/* ── Facilities ──────────────────────────────────────────── */}
              {facilities.length > 0 && (
                <View style={s.section}>
                  <SectionHeader icon="🏛" title="Campus Facilities" color="#7c3aed" />
                  <View style={s.twoColGrid}>
                    {facilities.map((item, i) => (
                      <View key={i} style={s.gridItem}>
                        <Text style={s.gridDot}>✓</Text>
                        <Text style={s.gridText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Research Areas ───────────────────────────────────────── */}
              {researchAreas.length > 0 && (
                <View style={s.section}>
                  <SectionHeader icon="🔬" title="Research Areas" color="#0891b2" />
                  <TagList items={researchAreas} />
                </View>
              )}

              {/* ── Student Life ─────────────────────────────────────────── */}
              {studentLife.length > 0 && (
                <View style={s.section}>
                  <SectionHeader icon="❤️" title="Student Life" color="#db2777" />
                  <View style={s.twoColGrid}>
                    {studentLife.map((item, i) => (
                      <View key={i} style={s.gridItem}>
                        <Text style={s.gridDot}>♦</Text>
                        <Text style={s.gridText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Accreditation ────────────────────────────────────────── */}
              {accreditation.length > 0 && (
                <View style={s.section}>
                  <SectionHeader icon="🛡" title="Accreditation & Partnerships" color="#166534" />
                  <BulletList items={accreditation} />
                </View>
              )}

              {/* ── Contact ──────────────────────────────────────────────── */}
              {(d.contactEmail || d.contactPhone || d.website || d.address) && (
                <View style={s.section}>
                  <SectionHeader icon="📬" title="Contact Information" color="#1d4ed8" />
                  {d.contactEmail ? (
                    <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL(`mailto:${d.contactEmail}`)}>
                      <Text style={s.contactIcon}>✉️</Text>
                      <View>
                        <Text style={s.contactLabel}>Email</Text>
                        <Text style={s.contactLink}>{d.contactEmail}</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                  {d.contactPhone ? (
                    <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL(`tel:${d.contactPhone}`)}>
                      <Text style={s.contactIcon}>📞</Text>
                      <View>
                        <Text style={s.contactLabel}>Phone</Text>
                        <Text style={s.contactLink}>{d.contactPhone}</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                  {d.website ? (
                    <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL(d.website!)}>
                      <Text style={s.contactIcon}>🌐</Text>
                      <View>
                        <Text style={s.contactLabel}>Website</Text>
                        <Text style={s.contactLink}>{d.website}</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                  {d.address ? (
                    <View style={s.contactRow}>
                      <Text style={s.contactIcon}>📍</Text>
                      <View>
                        <Text style={s.contactLabel}>Address</Text>
                        <Text style={s.contactValue}>{d.address}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              {/* ── Admission Instructions ───────────────────────────────── */}
              {d.admissionInstructions ? (
                <View style={s.section}>
                  <SectionHeader icon="📋" title="Admission Instructions" color="#16a34a" />
                  <Text style={s.bodyText}>{d.admissionInstructions}</Text>
                </View>
              ) : null}

              {/* ── Academic Programs ────────────────────────────────────── */}
              <View style={s.section}>
                <SectionHeader icon="🎓" title="Academic Programs" color="#1d4ed8" />
                {programs.length === 0 ? (
                  <View style={s.emptyPrograms}>
                    <Text style={s.emptyProgramsText}>📚 No programs listed yet</Text>
                  </View>
                ) : (
                  programs.map(prog => {
                    const expanded = expandedPrograms.has(prog.id);
                    return (
                      <TouchableOpacity
                        key={prog.id}
                        style={s.programCard}
                        onPress={() => toggleProgram(prog.id)}
                        activeOpacity={0.85}
                      >
                        <View style={s.programHeader}>
                          <View style={s.programIconBox}>
                            <Text style={s.programIconText}>📖</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.programName}>{prog.name}</Text>
                            {prog.code ? <Text style={s.programCode}>Code: {prog.code}</Text> : null}
                          </View>
                          <Text style={s.expandChevron}>{expanded ? '▲' : '▼'}</Text>
                        </View>
                        {expanded && (
                          <View style={s.programBody}>
                            {prog.description ? (
                              <Text style={s.programDesc}>{prog.description}</Text>
                            ) : null}
                            {prog.intakeCapacity ? (
                              <Text style={s.programMeta}>👥 Intake Capacity: {prog.intakeCapacity}</Text>
                            ) : null}
                            {prog.admissionTracks && prog.admissionTracks.length > 0 && (
                              <View style={{ marginTop: 8 }}>
                                <Text style={s.tracksTitle}>Admission Tracks:</Text>
                                {prog.admissionTracks.map(tr => (
                                  <View key={tr.id} style={s.trackRow}>
                                    <Text style={s.trackDot}>›</Text>
                                    <Text style={s.trackText}>{tr.name}</Text>
                                    {tr.intakeCapacity ? (
                                      <Text style={s.trackCap}> ({tr.intakeCapacity} seats)</Text>
                                    ) : null}
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Header
  header: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },

  // List
  listContent: { padding: 16, paddingBottom: 40, gap: 14 },
  emptyText: { fontSize: 16, color: '#64748b' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgePublic: { backgroundColor: '#dbeafe' },
  badgeOther: { backgroundColor: '#f3e8ff' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  cardName: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  cardStat: { fontSize: 12, color: '#64748b' },
  viewProfileBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewProfileBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Error / Retry
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  errorMsg: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modal: { flex: 1, backgroundColor: '#f1f5f9' },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  closeBtnText: { fontSize: 14, color: '#475569', fontWeight: '600' },
  modalScroll: { paddingBottom: 60 },

  // Hero
  hero: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  heroName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 12, lineHeight: 30 },
  heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Key Facts
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    marginHorizontal: 0,
    gap: 0,
  },
  factBox: {
    flex: 1,
    minWidth: '25%',
    alignItems: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  factNum: { fontSize: 20, fontWeight: '800', color: '#1d4ed8', marginBottom: 2 },
  factLabel: { fontSize: 11, color: '#64748b', textAlign: 'center' },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 20, marginRight: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },

  bodyText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  // Info rows
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoLabel: { width: 110, fontSize: 13, color: '#6b7280', fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: '#111827' },

  // Bullet list
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { fontSize: 16, color: '#1d4ed8', lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },

  // Tags
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },

  // 2-col grid
  twoColGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridItem: { width: '50%', flexDirection: 'row', alignItems: 'flex-start', paddingRight: 8, paddingVertical: 3 },
  gridDot: { fontSize: 13, color: '#1d4ed8', marginRight: 4, lineHeight: 20 },
  gridText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 19 },

  // Application dates
  appDateRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  appDateBox: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  appDateLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  appDateVal: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  statusBanner: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statusText: { fontSize: 14, fontWeight: '700' },

  // Contact
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contactIcon: { fontSize: 20, marginTop: 2 },
  contactLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 2 },
  contactLink: { fontSize: 14, color: '#1d4ed8', fontWeight: '600' },
  contactValue: { fontSize: 14, color: '#374151' },

  // Programs
  emptyPrograms: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyProgramsText: { fontSize: 14, color: '#1d4ed8', fontWeight: '600' },
  programCard: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  programIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  programIconText: { fontSize: 20 },
  programName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  programCode: { fontSize: 12, color: '#64748b', marginTop: 2 },
  expandChevron: { fontSize: 12, color: '#94a3b8' },
  programBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  programDesc: { fontSize: 13, color: '#475569', lineHeight: 20, marginTop: 10, marginBottom: 6 },
  programMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  tracksTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  trackDot: { fontSize: 16, color: '#1d4ed8', marginRight: 6 },
  trackText: { fontSize: 13, color: '#374151' },
  trackCap: { fontSize: 12, color: '#64748b' },
});
