// src/screens/OnboardPatientScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/apiService';
import DocumentUploadWidget, { getCategoryInfo } from '../components/DocumentUploadWidget';

// ─── Kenya Counties + Sub-Counties ───────────────────────────────────────────
const KENYA_COUNTIES = {
  Baringo: ['Baringo Central', 'Baringo North', 'Baringo South', 'Eldama Ravine', 'Mogotio', 'Tiaty'],
  Bomet: ['Bomet Central', 'Bomet East', 'Chepalungu', 'Konoin', 'Sotik'],
  Bungoma: ['Bumula', 'Kabuchai', 'Kanduyi', 'Kimilili', 'Mt. Elgon', 'Sirisia', 'Tongaren', 'Webuye East', 'Webuye West'],
  Busia: ['Budalangi', 'Butula', 'Funyula', 'Nambale', 'Teso North', 'Teso South'],
  'Elgeyo-Marakwet': ['Keiyo North', 'Keiyo South', 'Marakwet East', 'Marakwet West'],
  Embu: ['Manyatta', 'Mbeere North', 'Mbeere South', 'Runyenjes'],
  Garissa: ['Balambala', 'Dadaab', 'Fafi', 'Garissa Township', 'Hulugho', 'Ijara', 'Lagdera'],
  'Homa Bay': ['Homabay Town', 'Kabondo Kasipul', 'Karachuonyo', 'Kasipul', 'Mbita', 'Ndhiwa', 'Rangwe', 'Suba North', 'Suba South'],
  Isiolo: ['Garbatula', 'Isiolo', 'Merti'],
  Kajiado: ['Kajiado Central', 'Kajiado East', 'Kajiado North', 'Kajiado South', 'Loitokitok'],
  Kakamega: ['Butere', 'Ikolomani', 'Khwisero', 'Likuyani', 'Lugari', 'Lurambi', 'Matungu', 'Mumias East', 'Mumias West', 'Navakholo', 'Shinyalu'],
  Kericho: ['Ainamoi', 'Belgut', 'Buret', 'Kipkelion East', 'Kipkelion West', 'Soin/Sigowet'],
  Kiambu: ['Gatundu North', 'Gatundu South', 'Githunguri', 'Juja', 'Kabete', 'Kiambaa', 'Kiambu', 'Kikuyu', 'Limuru', 'Ruiru', 'Thika Town', 'Lari'],
  Kilifi: ['Ganze', 'Kaloleni', 'Kilifi North', 'Kilifi South', 'Magarini', 'Malindi', 'Rabai'],
  Kirinyaga: ['Gichugu', 'Kirinyaga Central', 'Mwea East', 'Mwea West', 'Ndia'],
  Kisii: ['Bomachoge Borabu', 'Bomachoge Chache', 'Bobasi', 'Bonchari', 'Kitutu Chache North', 'Kitutu Chache South', 'Nyaribari Chache', 'Nyaribari Masaba', 'South Mugirango'],
  Kisumu: ['Kisumu Central', 'Kisumu East', 'Kisumu West', 'Muhoroni', 'Nyakach', 'Nyando', 'Seme'],
  Kitui: ['Kitui Central', 'Kitui East', 'Kitui Rural', 'Kitui South', 'Kitui West', 'Mavoloni', 'Mwingi Central', 'Mwingi North', 'Mwingi West'],
  Kwale: ['Kinango', 'Lungalunga', 'Msambweni', 'Matuga'],
  Laikipia: ['Laikipia Central', 'Laikipia East', 'Laikipia North', 'Laikipia West', 'Nyahururu'],
  Lamu: ['Lamu East', 'Lamu West'],
  Machakos: ['Kathiani', 'Machakos Town', 'Masinga', 'Matungulu', 'Mavoko', 'Mwala', 'Yatta'],
  Makueni: ['Kaiti', 'Kibwezi East', 'Kibwezi West', 'Kilome', 'Makueni', 'Mbooni'],
  Mandera: ['Banissa', 'Lafey', 'Mandera East', 'Mandera North', 'Mandera South', 'Mandera West'],
  Marsabit: ['Laisamis', 'Moyale', 'North Horr', 'Saku'],
  Meru: ['Buuri', 'Igembe Central', 'Igembe North', 'Igembe South', 'Imenti Central', 'Imenti North', 'Imenti South', 'Tigania East', 'Tigania West'],
  Migori: ['Awendo', 'Kuria East', 'Kuria West', 'Mabera', 'Ntimaru', 'Rongo', 'Suna East', 'Suna West', 'Uriri'],
  Mombasa: ['Changamwe', 'Jomvu', 'Kisauni', 'Likoni', 'Mvita', 'Nyali'],
  "Murang'a": ["Gatanga", "Kahuro", "Kandara", "Kangema", "Kigumo", "Kiharu", "Mathioya", "Murang'a South"],
  Nairobi: ["Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West", "Kamukunji", "Kasarani", "Kibra", "Lang'ata", "Makadara", "Mathare", "Roysambu", "Ruaraka", "Starehe", "Westlands"],
  Nakuru: ['Bahati', 'Gilgil', 'Kuresoi North', 'Kuresoi South', 'Molo', 'Naivasha', 'Nakuru Town East', 'Nakuru Town West', 'Njoro', 'Rongai', 'Subukia'],
  Nandi: ['Aldai', 'Chesumei', 'Emgwen', 'Mosop', 'Nandi Hills', 'Tindiret'],
  Narok: ['Emurua Dikirr', 'Kilgoris', 'Narok East', 'Narok North', 'Narok South', 'Narok West'],
  Nyamira: ['Borabu', 'Manga', 'Masaba North', 'Nyamira North', 'Nyamira South'],
  Nyandarua: ['Kinangop', 'Kipipiri', 'Ndaragwa', 'Ol Kalou', 'Ol Joro Orok'],
  Nyeri: ['Kieni East', 'Kieni West', 'Mathira East', 'Mathira West', 'Mukurweini', 'Nyeri Town', 'Othaya', 'Tetu'],
  Samburu: ['Samburu East', 'Samburu North', 'Samburu West'],
  Siaya: ['Alego Usonga', 'Bondo', 'Gem', 'Rarieda', 'Ugenya', 'Ugunja'],
  'Taita-Taveta': ['Mwatate', 'Taveta', 'Voi', 'Wundanyi'],
  'Tana River': ['Bura', 'Galole', 'Garsen'],
  'Tharaka-Nithi': ["Chuka/Igambang'ombe", 'Maara', 'Tharaka North', 'Tharaka South'],
  'Trans Nzoia': ["Cherang'any", 'Endebess', 'Kiminini', 'Kwanza', 'Saboti'],
  Turkana: ['Loima', 'Turkana Central', 'Turkana East', 'Turkana North', 'Turkana South', 'Turkana West'],
  'Uasin Gishu': ['Ainabkoi', 'Kapseret', 'Kesses', 'Moiben', 'Soy', 'Turbo'],
  Vihiga: ['Emuhaya', 'Hamisi', 'Luanda', 'Sabatia', 'Vihiga'],
  Wajir: ['Eldas', 'Tarbaj', 'Wajir East', 'Wajir North', 'Wajir South', 'Wajir West'],
  'West Pokot': ['Central Pokot', 'North Pokot', 'Pokot South', 'West Pokot'],
};

const ALL_COUNTIES = Object.keys(KENYA_COUNTIES).sort();

// All world nationalities — Kenya pinned first
const ALL_NATIONALITIES = [
  'Kenyan',
  'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Argentine',
  'Armenian', 'Australian', 'Austrian', 'Azerbaijani', 'Bahamian', 'Bahraini',
  'Bangladeshi', 'Barbadian', 'Belarusian', 'Belgian', 'Belizean', 'Beninese',
  'Bhutanese', 'Bolivian', 'Bosnian', 'Botswanan', 'Brazilian', 'British',
  'Bruneian', 'Bulgarian', 'Burkinabe', 'Burundian', 'Cambodian', 'Cameroonian',
  'Canadian', 'Cape Verdean', 'Central African', 'Chadian', 'Chilean', 'Chinese',
  'Colombian', 'Comorian', 'Congolese', 'Costa Rican', 'Croatian', 'Cuban',
  'Cypriot', 'Czech', 'Danish', 'Djiboutian', 'Dominican', 'Dutch', 'Ecuadorian',
  'Egyptian', 'Emirati', 'Equatorial Guinean', 'Eritrean', 'Estonian', 'Eswatini',
  'Ethiopian', 'Fijian', 'Finnish', 'French', 'Gabonese', 'Gambian', 'Georgian',
  'German', 'Ghanaian', 'Greek', 'Grenadian', 'Guatemalan', 'Guinean',
  'Guinea-Bissauan', 'Guyanese', 'Haitian', 'Honduran', 'Hungarian', 'Icelandic',
  'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Israeli', 'Italian',
  'Ivorian', 'Jamaican', 'Japanese', 'Jordanian', 'Kazakhstani', 'Kiribati',
  'Kuwaiti', 'Kyrgyz', 'Laotian', 'Latvian', 'Lebanese', 'Lesothan', 'Liberian',
  'Libyan', 'Liechtensteiner', 'Lithuanian', 'Luxembourgish', 'Madagascan',
  'Malawian', 'Malaysian', 'Maldivian', 'Malian', 'Maltese', 'Marshallese',
  'Mauritanian', 'Mauritian', 'Mexican', 'Micronesian', 'Moldovan', 'Monacan',
  'Mongolian', 'Montenegrin', 'Moroccan', 'Mozambican', 'Myanmarese', 'Namibian',
  'Nauruan', 'Nepalese', 'New Zealander', 'Nicaraguan', 'Nigerien', 'Nigerian',
  'North Korean', 'North Macedonian', 'Norwegian', 'Omani', 'Pakistani', 'Palauan',
  'Palestinian', 'Panamanian', 'Papua New Guinean', 'Paraguayan', 'Peruvian',
  'Filipino', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan',
  'Saint Lucian', 'Salvadoran', 'Samoan', 'Saudi', 'Senegalese', 'Serbian',
  'Sierra Leonean', 'Singaporean', 'Slovak', 'Slovenian', 'Solomon Islander',
  'Somali', 'South African', 'South Korean', 'South Sudanese', 'Spanish',
  'Sri Lankan', 'Sudanese', 'Surinamese', 'Swedish', 'Swiss', 'Syrian',
  'Taiwanese', 'Tajik', 'Tanzanian', 'Thai', 'Timorese', 'Togolese', 'Tongan',
  'Trinidadian', 'Tunisian', 'Turkish', 'Turkmen', 'Tuvaluan', 'Ugandan',
  'Ukrainian', 'Uruguayan', 'Uzbek', 'Vanuatuan', 'Venezuelan', 'Vietnamese',
  'Yemeni', 'Zambian', 'Zimbabwean',
];

const ID_TYPES = ['National ID', 'Passport', 'Birth Certificate', 'Military ID', 'Alien Card'];
const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Rev', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'];
const PATIENT_TYPES = ['Cash', 'Insurance / NHIF', 'Government Scheme'];
const HOW_KNOWN = ['Friend / Family', 'Social Media', 'Referral', 'Walk-in', 'Doctor Referral', 'Advertisement', 'Other'];

const RELATIONSHIPS = [
  'Brother', 'Brother in Law', 'Cousin', 'Daughter', 'Father', 'Father in Law',
  'Friend', 'Guardian', 'Husband', 'Mistress', 'Mother', 'Mother in Law',
  'Nephew', 'Niece', 'Other', 'Parent', 'Sister', 'Sister in Law', 'Son',
  'Spouse', 'Uncle', 'Wife',
];

const EMPTY_KIN = { firstName: '', lastName: '', relationship: '', phone: '' };

// ─── Calendar DOB Picker ──────────────────────────────────────────────────────
function CalendarPicker({ value, onSelect, onClose }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(value ? new Date(value).getFullYear() : today.getFullYear() - 30);
  const [viewMonth, setViewMonth] = useState(value ? new Date(value).getMonth() : 0);
  const [mode, setMode] = useState('day'); // 'day' | 'month' | 'year'

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

  const selectedDate = value ? new Date(value) : null;

  const isSameDay = (d) =>
    selectedDate &&
    d === selectedDate.getDate() &&
    viewMonth === selectedDate.getMonth() &&
    viewYear === selectedDate.getFullYear();

  const handleDayPress = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    onSelect(d.toISOString().split('T')[0]);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Year range: 1920 to today
  const years = Array.from({ length: today.getFullYear() - 1919 }, (_, i) => today.getFullYear() - i);

  const renderDays = () => {
    const days = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDay(viewYear, viewMonth);
    const cells = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }

    return rows.map((row, ri) => (
      <View key={ri} style={cal.row}>
        {row.map((day, di) => (
          <TouchableOpacity
            key={di}
            style={[cal.dayCell, day && isSameDay(day) && cal.selectedDay,
              day && new Date(viewYear, viewMonth, day) > today && cal.futureDay]}
            onPress={() => day && new Date(viewYear, viewMonth, day) <= today && handleDayPress(day)}
            disabled={!day || new Date(viewYear, viewMonth, day) > today}
          >
            <Text style={[cal.dayText, day && isSameDay(day) && cal.selectedDayText, !day && { opacity: 0 }]}>
              {day || ''}
            </Text>
          </TouchableOpacity>
        ))}
        {row.length < 7 && Array.from({ length: 7 - row.length }).map((_, i) => (
          <View key={`e${i}`} style={cal.dayCell} />
        ))}
      </View>
    ));
  };

  return (
    <View style={cal.container}>
      {/* Header */}
      <View style={cal.header}>
        <TouchableOpacity onPress={onClose} style={cal.closeBtn}>
          <Ionicons name="close" size={20} color="#64748b" />
        </TouchableOpacity>
        <Text style={cal.title}>Date of Birth</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Month / Year toggle row */}
      {mode === 'day' && (
        <View style={cal.navRow}>
          <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#0f766e" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('month')} style={cal.monthYearBtn}>
            <Text style={cal.monthYearText}>{MONTH_FULL[viewMonth]}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('year')} style={cal.monthYearBtn}>
            <Text style={cal.monthYearText}>{viewYear}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="#0f766e" />
          </TouchableOpacity>
        </View>
      )}

      {/* Day grid */}
      {mode === 'day' && (
        <View style={cal.grid}>
          <View style={cal.row}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <Text key={d} style={cal.weekLabel}>{d}</Text>
            ))}
          </View>
          {renderDays()}
        </View>
      )}

      {/* Month picker */}
      {mode === 'month' && (
        <View style={cal.monthGrid}>
          {MONTHS.map((m, i) => (
            <TouchableOpacity key={m} style={[cal.monthCell, viewMonth === i && cal.selectedMonth]}
              onPress={() => { setViewMonth(i); setMode('day'); }}>
              <Text style={[cal.monthCellText, viewMonth === i && cal.selectedMonthText]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Year picker */}
      {mode === 'year' && (
        <FlatList
          data={years}
          keyExtractor={y => String(y)}
          style={cal.yearList}
          renderItem={({ item: y }) => (
            <TouchableOpacity style={[cal.yearItem, viewYear === y && cal.selectedYear]}
              onPress={() => { setViewYear(y); setMode('day'); }}>
              <Text style={[cal.yearItemText, viewYear === y && cal.selectedYearText]}>{y}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ─── Generic Dropdown ─────────────────────────────────────────────────────────
function DropdownField({ label, value, options, onSelect, placeholder, required, icon }) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>{label}{required && <Text style={f.required}> *</Text>}</Text>
      <TouchableOpacity style={[f.input, f.dropdownTrigger]} onPress={() => { setVisible(true); setSearch(''); }} activeOpacity={0.7}>
        {icon && <MaterialCommunityIcons name={icon} size={16} color={value ? '#334155' : '#94a3b8'} style={{ marginRight: 8 }} />}
        <Text style={[f.dropdownText, !value && f.placeholderText]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={f.overlay} onPress={() => setVisible(false)} activeOpacity={1}>
          <View style={f.modalCard}>
            <Text style={f.modalTitle}>{label}</Text>
            <View style={f.searchBox}>
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput style={f.searchInput} placeholder="Search..." value={search} onChangeText={setSearch} autoFocus />
            </View>
            <FlatList data={filtered} keyExtractor={i => i} style={f.list}
              renderItem={({ item }) => (
                <TouchableOpacity style={[f.listItem, value === item && f.listItemActive]}
                  onPress={() => { onSelect(item); setVisible(false); }}>
                  <Text style={[f.listItemText, value === item && f.listItemTextActive]}>{item}</Text>
                  {value === item && <Ionicons name="checkmark" size={16} color="#0f766e" />}
                </TouchableOpacity>
              )} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Nationality Autocomplete ─────────────────────────────────────────────────
function NationalityField({ value, onSelect, required }) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  const filtered = search.length > 0
    ? ALL_NATIONALITIES.filter(n => n.toLowerCase().includes(search.toLowerCase()))
    : ALL_NATIONALITIES;

  const open = () => {
    setSearch('');
    setVisible(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>Nationality{required && <Text style={f.required}> *</Text>}</Text>
      <TouchableOpacity style={[f.input, f.dropdownTrigger]} onPress={open} activeOpacity={0.7}>
        <Ionicons name="earth" size={16} color={value ? '#334155' : '#94a3b8'} style={{ marginRight: 8 }} />
        <Text style={[f.dropdownText, !value && f.placeholderText]}>{value || 'Search nationality...'}</Text>
        <Ionicons name="search" size={16} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View style={f.overlay}>
          <View style={[f.modalCard, { maxHeight: '80%' }]}>
            <Text style={f.modalTitle}>Select Nationality</Text>

            {/* Search bar */}
            <View style={[f.searchBox, { marginBottom: 4 }]}>
              <Ionicons name="search" size={16} color="#0f766e" />
              <TextInput
                ref={inputRef}
                style={f.searchInput}
                placeholder="Type to search..."
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={i => i}
              style={f.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isKenya = item === 'Kenyan';
                return (
                  <TouchableOpacity
                    style={[f.listItem, value === item && f.listItemActive, isKenya && f.kenyaItem]}
                    onPress={() => { onSelect(item); setVisible(false); setSearch(''); }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isKenya && <Text style={{ fontSize: 16 }}>🇰🇪</Text>}
                      <Text style={[f.listItemText, value === item && f.listItemTextActive, isKenya && f.kenyaText]}>
                        {item}
                      </Text>
                      {isKenya && (
                        <View style={f.pinnedBadge}>
                          <Text style={f.pinnedBadgeText}>Local</Text>
                        </View>
                      )}
                    </View>
                    {value === item && <Ionicons name="checkmark" size={16} color="#0f766e" />}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity style={f.cancelBtn} onPress={() => { setVisible(false); setSearch(''); }}>
              <Text style={f.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── DOB Field (opens calendar) ───────────────────────────────────────────────
function DOBField({ value, onChange }) {
  const [showCal, setShowCal] = useState(false);

  const display = value
    ? new Date(value).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>Date of Birth</Text>
      <TouchableOpacity style={[f.input, f.dropdownTrigger]} onPress={() => setShowCal(true)} activeOpacity={0.7}>
        <MaterialCommunityIcons name="calendar" size={16} color={value ? '#0f766e' : '#94a3b8'} style={{ marginRight: 8 }} />
        <Text style={[f.dropdownText, !value && f.placeholderText]}>
          {display || 'Select date of birth'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={showCal} transparent animationType="fade">
        <View style={f.overlay}>
          <View style={cal.modal}>
            <CalendarPicker
              value={value}
              onSelect={(d) => { onChange(d); setShowCal(false); }}
              onClose={() => setShowCal(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Text Field ───────────────────────────────────────────────────────────────
function TextField({ label, value, onChangeText, placeholder, required, keyboardType, icon, hint }) {
  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>{label}{required && <Text style={f.required}> *</Text>}</Text>
      <View style={f.inputRow}>
        {icon && <MaterialCommunityIcons name={icon} size={16} color="#94a3b8" style={f.inputIcon} />}
        <TextInput
          style={[f.input, f.textInput, icon && f.inputWithIcon]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#cbd5e1"
          keyboardType={keyboardType || 'default'}
        />
      </View>
      {hint && <Text style={f.hint}>{hint}</Text>}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, icon, color = '#0f766e' }) {
  return (
    <View style={[f.sectionHeader, { borderLeftColor: color }]}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[f.sectionTitle, { color }]}>{title}</Text>
    </View>
  );
}

// ─── Next of Kin Card ─────────────────────────────────────────────────────────
function KinCard({ kin, index, onChange, onRemove, canRemove }) {
  return (
    <View style={kinStyle.card}>
      <View style={kinStyle.cardHeader}>
        <View style={kinStyle.kinBadge}>
          <MaterialCommunityIcons name="account-heart-outline" size={14} color="#7c3aed" />
          <Text style={kinStyle.kinBadgeText}>Next of Kin {index + 1}</Text>
        </View>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={kinStyle.removeBtn}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      <View style={kinStyle.row}>
        <View style={{ flex: 1 }}>
          <Text style={f.label}>First Name</Text>
          <TextInput
            style={[f.input, { marginTop: 2 }]}
            value={kin.firstName}
            onChangeText={v => onChange({ ...kin, firstName: v })}
            placeholder="e.g. Rachel"
            placeholderTextColor="#cbd5e1"
          />
        </View>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={f.label}>Last Name</Text>
          <TextInput
            style={[f.input, { marginTop: 2 }]}
            value={kin.lastName}
            onChangeText={v => onChange({ ...kin, lastName: v })}
            placeholder="e.g. Sitei"
            placeholderTextColor="#cbd5e1"
          />
        </View>
      </View>

      <View style={[kinStyle.row, { marginTop: 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={f.label}>Relationship</Text>
          <KinRelationshipPicker
            value={kin.relationship}
            onSelect={v => onChange({ ...kin, relationship: v })}
          />
        </View>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={f.label}>Phone Number</Text>
          <TextInput
            style={[f.input, { marginTop: 2 }]}
            value={kin.phone}
            onChangeText={v => onChange({ ...kin, phone: v })}
            placeholder="07XXXXXXXX"
            placeholderTextColor="#cbd5e1"
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </View>
  );
}

function KinRelationshipPicker({ value, onSelect }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[f.input, f.dropdownTrigger, { marginTop: 2 }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[f.dropdownText, !value && f.placeholderText, { fontSize: 13 }]}>
          {value || 'Select...'}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#94a3b8" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={f.overlay} onPress={() => setVisible(false)} activeOpacity={1}>
          <View style={f.modalCard}>
            <Text style={f.modalTitle}>Relationship</Text>
            <FlatList
              data={RELATIONSHIPS}
              keyExtractor={i => i}
              style={f.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[f.listItem, value === item && f.listItemActive]}
                  onPress={() => { onSelect(item); setVisible(false); }}
                >
                  <Text style={[f.listItemText, value === item && f.listItemTextActive]}>{item}</Text>
                  {value === item && <Ionicons name="checkmark" size={16} color="#0f766e" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OnboardPatientScreen({ onBack, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', firstName: '', middleName: '', lastName: '',
    gender: '', dateOfBirth: '', phone: '', email: '',
    maritalStatus: '', occupation: '',
    idType: '', idNumber: '',
    nationality: '', county: '', subCounty: '',
    postalCode: '', howKnown: '', patientType: '',
    medicalPlan: '', membershipNo: '',
  });
  const [nextOfKin, setNextOfKin] = useState([{ ...EMPTY_KIN }]);
  const [pendingDocs, setPendingDocs] = useState([]);  // staged docs before patient saved

  const set = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleNationality = (val) => {
    setForm(prev => ({ ...prev, nationality: val, county: '', subCounty: '' }));
  };
  const handleCounty = (val) => {
    setForm(prev => ({ ...prev, county: val, subCounty: '' }));
  };

  const subCounties = form.county ? KENYA_COUNTIES[form.county] || [] : [];

  const updateKin = (index, updated) => {
    setNextOfKin(prev => prev.map((k, i) => i === index ? updated : k));
  };
  const addKin = () => setNextOfKin(prev => [...prev, { ...EMPTY_KIN }]);
  const removeKin = (index) => setNextOfKin(prev => prev.filter((_, i) => i !== index));

  const handleDocReady = (fileObj) => {
    setPendingDocs((prev) => [...prev, { ...fileObj, localId: Date.now().toString() }]);
  };

  const handleDiscardStagedDoc = (localId) => {
    setPendingDocs((prev) => prev.filter((d) => d.localId !== localId));
  };

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required';
    if (!form.lastName.trim()) return 'Last name is required';
    if (!form.gender) return 'Gender is required';
    if (!form.phone.trim()) return 'Phone number is required';
    if (!form.idType) return 'Identity type is required';
    if (!form.idNumber.trim()) return 'Identity number is required';
    if (!form.nationality) return 'Nationality is required';
    if (form.nationality === 'Kenyan' && !form.county) return 'County is required for Kenyan patients';
    if (form.nationality === 'Kenyan' && !form.subCounty) return 'Sub-county is required';
    if (!form.patientType) return 'Patient type is required';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) { Alert.alert('Missing Information', error); return; }

    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        middleName: form.middleName.trim() || undefined,
        title: form.title || undefined,
        gender: form.gender.toLowerCase(),
        dateOfBirth: form.dateOfBirth || undefined,
        phoneNumber: form.phone.trim(),
        email: form.email.trim() || undefined,
        maritalStatus: form.maritalStatus || undefined,
        occupation: form.occupation.trim() || undefined,
        idType: form.idType,
        idNumber: form.idNumber.trim(),
        nationality: form.nationality,
        county: form.county || undefined,
        subCounty: form.subCounty || undefined,
        postalCode: form.postalCode.trim() || undefined,
        howKnown: form.howKnown || undefined,
        patientType: form.patientType,
        medicalPlan: form.medicalPlan.trim() || undefined,
        membershipNo: form.membershipNo.trim() || undefined,
        nextOfKin: nextOfKin.filter(k => k.firstName.trim() || k.lastName.trim()),
      };

      const createdPatient = await apiService.createPatient(payload);

      // Upload any staged documents
      if (pendingDocs.length > 0 && createdPatient?.id) {
        for (const doc of pendingDocs) {
          try {
            await apiService.uploadPatientLevelDocument(createdPatient.id, doc);
          } catch (e) {
            console.error('Doc upload failed:', e.message);
          }
        }
      }

      Alert.alert(
        '✅ Patient Registered',
        `${form.firstName} ${form.lastName} has been successfully onboarded.`,
        [{ text: 'OK', onPress: () => { setPendingDocs([]); onSuccess && onSuccess(); } }]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to register patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>New Patient</Text>
          <Text style={styles.headerSub}>Fill in the details below</Text>
        </View>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="account-plus" size={20} color="#0f766e" />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Personal Info ── */}
        <SectionHeader title="Personal Information" icon="account-outline" />
        <DropdownField label="Title" value={form.title} options={TITLES} onSelect={set('title')} placeholder="Select title" icon="account-tie-outline" />
        <TextField label="First Name" value={form.firstName} onChangeText={set('firstName')} placeholder="e.g. Wanjiru" required icon="account-outline" />
        <TextField label="Middle Name" value={form.middleName} onChangeText={set('middleName')} placeholder="e.g. Namuata" icon="account-outline" />
        <TextField label="Last Name" value={form.lastName} onChangeText={set('lastName')} placeholder="e.g. Kamau" required icon="account-outline" />
        <DropdownField label="Gender" value={form.gender} options={GENDERS} onSelect={set('gender')} placeholder="Select gender" required icon="gender-male-female" />

        {/* DOB — calendar picker */}
        <DOBField value={form.dateOfBirth} onChange={set('dateOfBirth')} />

        <DropdownField label="Marital Status" value={form.maritalStatus} options={MARITAL_STATUSES} onSelect={set('maritalStatus')} placeholder="Select status" icon="heart-outline" />
        <TextField label="Occupation" value={form.occupation} onChangeText={set('occupation')} placeholder="e.g. Teacher, Farmer" icon="briefcase-outline" />

        {/* ── Contact ── */}
        <SectionHeader title="Contact Details" icon="phone-outline" color="#2563eb" />
        <TextField label="Phone Number" value={form.phone} onChangeText={set('phone')} placeholder="e.g. 0712345678" required keyboardType="phone-pad" icon="cellphone" />
        <TextField label="Email Address" value={form.email} onChangeText={set('email')} placeholder="e.g. name@email.com" keyboardType="email-address" icon="email-outline" />

        {/* ── Identity ── */}
        <SectionHeader title="Identity Verification" icon="card-account-details-outline" color="#7c3aed" />
        <DropdownField label="Identity Type" value={form.idType} options={ID_TYPES} onSelect={set('idType')} placeholder="Select ID type" required icon="card-account-details-outline" />
        {form.idType ? (
          <TextField label={`${form.idType} Number`} value={form.idNumber} onChangeText={set('idNumber')} placeholder={`Enter your ${form.idType} number`} required keyboardType={form.idType === 'National ID' ? 'numeric' : 'default'} icon="numeric" />
        ) : null}

        {/* ── Location ── */}
        <SectionHeader title="Location" icon="map-marker-outline" color="#d97706" />

        {/* Nationality autocomplete */}
        <NationalityField value={form.nationality} onSelect={handleNationality} required />

        {form.nationality === 'Kenyan' && (
          <>
            <DropdownField label="County" value={form.county} options={ALL_COUNTIES} onSelect={handleCounty} placeholder="Select county" required icon="map-outline" />
            {form.county ? (
              <DropdownField label="Sub-County" value={form.subCounty} options={subCounties} onSelect={set('subCounty')} placeholder="Select sub-county" required icon="map-marker-radius-outline" />
            ) : null}
          </>
        )}
        <TextField label="Postal Code" value={form.postalCode} onChangeText={set('postalCode')} placeholder="e.g. 00100" keyboardType="numeric" icon="mailbox-outline" />

        {/* ── Next of Kin ── */}
        <SectionHeader title="Next of Kin" icon="account-heart-outline" color="#7c3aed" />

        {nextOfKin.map((kin, index) => (
          <KinCard
            key={index}
            kin={kin}
            index={index}
            onChange={(updated) => updateKin(index, updated)}
            onRemove={() => removeKin(index)}
            canRemove={nextOfKin.length > 1}
          />
        ))}

        <TouchableOpacity style={styles.addKinBtn} onPress={addKin} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={18} color="#7c3aed" />
          <Text style={styles.addKinText}>Add Another Next of Kin</Text>
        </TouchableOpacity>

        {/* ── Documents ── */}
        <View style={{ marginTop: 8 }}>
          <SectionHeader title="Documents" icon="file-document-multiple-outline" color="#0891b2" />

          {/* Staged docs list */}
          {pendingDocs.length > 0 && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              {pendingDocs.map((doc) => {
                const cat = getCategoryInfo(doc.category);
                return (
                  <View
                    key={doc.localId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f0fdf4',
                      borderRadius: 10,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: '#bbf7d0',
                      gap: 10,
                    }}
                  >
                    <View style={{
                      width: 36, height: 36, borderRadius: 8,
                      backgroundColor: cat.color + '20',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Ionicons name={cat.icon} size={18} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b' }} numberOfLines={1}>
                        {doc.documentName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>{cat.label}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDiscardStagedDoc(doc.localId)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Upload widget */}
          <DocumentUploadWidget onFileReady={handleDocReady} />

          <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, marginLeft: 4 }}>
            Documents are uploaded after the patient is registered.
          </Text>
        </View>

        {/* ── Facility Info ── */}
        <SectionHeader title="Facility Information" icon="hospital-building" color="#0f766e" />
        <DropdownField label="How did you know about this facility?" value={form.howKnown} options={HOW_KNOWN} onSelect={set('howKnown')} placeholder="Select option" icon="information-outline" />
        <DropdownField label="Patient Type" value={form.patientType} options={PATIENT_TYPES} onSelect={set('patientType')} placeholder="Cash or Insurance?" required icon="credit-card-outline" />

        {(form.patientType === 'Insurance / NHIF' || form.patientType === 'Government Scheme') && (
          <>
            <TextField label="Medical Plan / Scheme" value={form.medicalPlan} onChangeText={set('medicalPlan')} placeholder="e.g. NHIF, AAR, Britam" icon="shield-check-outline" />
            <TextField label="Membership / Card Number" value={form.membershipNo} onChangeText={set('membershipNo')} placeholder="Enter membership number" icon="card-text-outline" />
          </>
        )}

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <MaterialCommunityIcons name="account-check-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Register Patient</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ─── Shared Field Styles ──────────────────────────────────────────────────────
const f = StyleSheet.create({
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  required: { color: '#ef4444' },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 15,
    color: '#0f172a',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
  },
  inputIcon: { paddingLeft: 14 },
  textInput: { flex: 1, borderWidth: 0, backgroundColor: 'transparent' },
  inputWithIcon: { paddingLeft: 8 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { flex: 1, fontSize: 15, color: '#0f172a' },
  placeholderText: { color: '#cbd5e1' },
  hint: { fontSize: 11, color: '#94a3b8', marginTop: 4, marginLeft: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderLeftWidth: 3, paddingLeft: 10, marginTop: 24, marginBottom: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, maxHeight: '75%',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', paddingHorizontal: 20, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
    borderRadius: 10, marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  list: { maxHeight: 360 },
  listItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  listItemActive: { backgroundColor: '#f0fdf9' },
  listItemText: { fontSize: 15, color: '#334155' },
  listItemTextActive: { color: '#0f766e', fontWeight: '700' },
  // Kenya pinned styles
  kenyaItem: { backgroundColor: '#f0fdf9', borderBottomWidth: 2, borderBottomColor: '#ccfbf1' },
  kenyaText: { fontWeight: '700', color: '#0f766e' },
  pinnedBadge: { backgroundColor: '#0f766e', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  pinnedBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  cancelBtn: { margin: 16, padding: 14, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
});

// ─── Calendar Styles ──────────────────────────────────────────────────────────
const cal = StyleSheet.create({
  modal: {
    marginHorizontal: 16,
    marginVertical: 'auto',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  container: { backgroundColor: '#fff', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0fdf9', justifyContent: 'center', alignItems: 'center' },
  monthYearBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 8 },
  monthYearText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  grid: { marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  weekLabel: { width: 36, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94a3b8', paddingVertical: 4 },
  dayCell: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  selectedDay: { backgroundColor: '#0f766e' },
  selectedDayText: { color: '#fff', fontWeight: '800' },
  futureDay: { opacity: 0.3 },
  // Month picker
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 16 },
  monthCell: { width: '25%', padding: 10, alignItems: 'center', borderRadius: 10, marginVertical: 4 },
  monthCellText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  selectedMonth: { backgroundColor: '#0f766e' },
  selectedMonthText: { color: '#fff' },
  // Year picker
  yearList: { maxHeight: 280 },
  yearItem: { paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  yearItemText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  selectedYear: { backgroundColor: '#f0fdf9' },
  selectedYearText: { color: '#0f766e', fontWeight: '800' },
});

// ─── Next of Kin Styles ───────────────────────────────────────────────────────
const kinStyle = StyleSheet.create({
  card: {
    backgroundColor: '#faf5ff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#ede9fe',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  kinBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  kinBadgeText: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  removeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row' },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 16 : 12, paddingBottom: 16,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#e6fdf8', justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 16 },
  addKinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#ddd6fe', borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 12, marginBottom: 4,
  },
  addKinText: { fontSize: 14, fontWeight: '600', color: '#7c3aed' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#0f766e', borderRadius: 16, paddingVertical: 16, marginTop: 24,
    shadowColor: '#0f766e', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#ffffff', letterSpacing: 0.2 },
});