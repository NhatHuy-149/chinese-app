// Topic list for the vocabulary (ids are stable: words and progress reference them).
export const TOPICS = [
  { id: 'greetings', vi: 'Chào hỏi & giao tiếp cơ bản' },
  { id: 'phrases', vi: 'Câu giao tiếp thường dùng' },
  { id: 'pronouns-measures', vi: 'Đại từ & lượng từ' },
  { id: 'numbers', vi: 'Số đếm & đơn vị' },
  { id: 'time', vi: 'Thời gian & ngày tháng' },
  { id: 'family', vi: 'Gia đình & quan hệ' },
  { id: 'people', vi: 'Con người & ngoại hình' },
  { id: 'feelings', vi: 'Cảm xúc & tính cách' },
  { id: 'body-health', vi: 'Cơ thể & sức khỏe' },
  { id: 'food', vi: 'Ăn uống & nhà hàng' },
  { id: 'shopping-money', vi: 'Mua sắm & tiền bạc' },
  { id: 'clothes-colors', vi: 'Quần áo & màu sắc' },
  { id: 'home', vi: 'Nhà cửa & đồ dùng' },
  { id: 'daily-life', vi: 'Sinh hoạt hằng ngày' },
  { id: 'transport-travel', vi: 'Giao thông & du lịch' },
  { id: 'places-directions', vi: 'Địa điểm & phương hướng' },
  { id: 'city-services', vi: 'Dịch vụ trong thành phố' },
  { id: 'work', vi: 'Công việc & nghề nghiệp' },
  { id: 'study-language', vi: 'Học tập & ngôn ngữ' },
  { id: 'tech-phone', vi: 'Công nghệ & điện thoại' },
  { id: 'weather-nature', vi: 'Thời tiết & thiên nhiên' },
  { id: 'hobbies-sports', vi: 'Sở thích, thể thao & giải trí' },
  { id: 'verbs-action', vi: 'Động từ thông dụng: hành động' },
  { id: 'verbs-mind', vi: 'Động từ thông dụng: tư duy & giao tiếp' },
  { id: 'adjectives', vi: 'Tính từ thông dụng' },
  { id: 'adverbs-degree', vi: 'Trạng từ & mức độ' },
  { id: 'function-words', vi: 'Hư từ: giới từ, liên từ, trợ từ' },
] as const;

export type TopicId = (typeof TOPICS)[number]['id'];
export const TOPIC_IDS = TOPICS.map(t => t.id) as [TopicId, ...TopicId[]];
