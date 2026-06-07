"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Database,
  GitBranch,
  HeartHandshake,
  Info,
  LockKeyhole,
  Mail,
  Network,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

const featureGroups = [
  {
    icon: Network,
    title: "Sơ đồ gia phả Việt Nam",
    items: [
      "Hiển thị cây gia phả nhiều đời, nhiều nhánh, hỗ trợ đa phu/đa thê, con chung, con riêng.",
      "Có các tùy chọn ẩn/hiện dâu rể, ẩn nam/nữ, thu gọn sơ đồ, chọn người gốc và mở rộng từng nhánh.",
      "Hỗ trợ nhiều kiểu xem như cây gia phả, mindmap và bong bóng.",
    ],
  },
  {
    icon: Users,
    title: "Nội / Ngoại và Sui gia",
    items: [
      "So sánh các thế hệ hai bên nội ngoại của người được chọn.",
      "Hiển thị tương quan bên chồng, bên vợ và các nhánh sui gia trực tiếp.",
      "Gợi ý cách xưng hô theo miền Bắc, miền Nam hoặc cách gọi trung tính.",
    ],
  },
  {
    icon: GitBranch,
    title: "Quan hệ, hôn nhân và sự kiện",
    items: [
      "Quản lý cha mẹ, con cái, vợ chồng, ly hôn và khôi phục hôn nhân.",
      "Ghi nhận sự kiện sinh, mất, kết hôn, ly hôn, an táng, cư trú, nghề nghiệp, ngày giỗ và sự kiện khác.",
      "Hỗ trợ ngày dương lịch, ngày âm lịch, ngày không đầy đủ và ghi chú sự kiện.",
    ],
  },
  {
    icon: Database,
    title: "GEDCOM, Data Quality và Audit Log",
    items: [
      "Hỗ trợ xuất/nhập GEDCOM, có chế độ riêng cho FamilyGem để phù hợp tên tiếng Việt.",
      "Có công cụ kiểm tra và sửa lỗi dữ liệu như Family Model lỗi, sự kiện thiếu liên kết, person_events sai.",
      "Audit Log ghi lại các thao tác quan trọng như sửa user, repair dữ liệu, import GEDCOM, thay đổi quan hệ.",
    ],
  },
  {
    icon: LockKeyhole,
    title: "Phân quyền theo nhánh gia phả",
    items: [
      "Admin có thể gán mỗi tài khoản với một người trong gia phả.",
      "Thành viên thường chỉ xem được nhánh nội ngoại của mình, vợ/chồng trong nhánh, và nội ngoại bên vợ/chồng trực tiếp.",
      "Không xem được nhánh thông gia của dâu/rể người khác; sự kiện, tìm kiếm, thống kê và sơ đồ đều được lọc theo quyền.",
    ],
  },
  {
    icon: Sparkles,
    title: "Tối ưu cho gia đình tự quản lý",
    items: [
      "Người dùng có thể tự đổi mật khẩu và chọn gốc sơ đồ, gốc Nội/Ngoại, gốc Sui gia, gốc Thống kê.",
      "Admin có thể tạo user, reset mật khẩu, đổi vai trò, gán người trong gia phả và quản lý quyền truy cập.",
      "Dữ liệu được tự lưu trữ trên Supabase/database của người triển khai.",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] selection:bg-amber-200 selection:text-amber-900 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none" />

      <Link href="/dashboard" className="btn absolute top-6 left-6 z-20">
        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại
      </Link>

      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20 relative z-10 w-full mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-5xl w-full"
        >
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-stone-200 mb-8 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-100/50 text-amber-700 rounded-2xl">
                <Info className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
                  Gia phả Thường Lê
                </p>
                <h1 className="title">Giới thiệu dự án</h1>
              </div>
            </div>

            <div className="max-w-none">
              <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-stone-50 to-white border border-amber-100/70 p-6 sm:p-8 mb-8">
                <p className="text-stone-700 leading-relaxed text-[15.5px] mb-4">
                  <strong className="text-stone-900">Gia phả Thường Lê</strong>{" "}
                  là dự án số hóa và quản lý gia phả được xây dựng dựa trên{" "}
                  <strong className="text-stone-900">Gia Phả OS</strong>, hướng
                  đến việc lưu giữ thông tin cội nguồn, quan hệ họ hàng, hôn
                  nhân, sự kiện gia đình và vai vế xưng hô theo cách phù hợp với
                  văn hóa Việt Nam.
                </p>

                <p className="text-stone-700 leading-relaxed text-[15.5px] mb-4">
                  Dự án được phát triển để các thành viên trong gia đình có thể
                  cùng tra cứu, cập nhật và gìn giữ dữ liệu nhiều thế hệ trên
                  một hệ thống trực tuyến. Thay vì phụ thuộc vào file rời rạc
                  hoặc phần mềm cục bộ, dữ liệu được tổ chức thành cây gia phả,
                  các nhánh nội ngoại, sui gia, sự kiện và nhật ký thay đổi rõ
                  ràng.
                </p>

                <p className="text-stone-700 leading-relaxed text-[15.5px]">
                  Mục tiêu lâu dài là tạo ra một hệ thống gia phả tự lưu trữ,
                  bảo mật, dễ dùng cho gia đình Việt Nam: người quản trị kiểm
                  soát toàn bộ dữ liệu, còn từng thành viên chỉ xem được phần
                  gia phả phù hợp với quyền của mình.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {featureGroups.map((group) => {
                  const Icon = group.icon;

                  return (
                    <div
                      key={group.title}
                      className="rounded-2xl border border-stone-200/70 bg-stone-50/60 p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-white text-amber-700 rounded-xl border border-stone-200 shadow-sm">
                          <Icon className="size-5" />
                        </div>
                        <h2 className="text-base font-bold text-stone-900">
                          {group.title}
                        </h2>
                      </div>

                      <ul className="space-y-2 text-[14px] leading-relaxed text-stone-600 list-disc pl-5">
                        {group.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <HeartHandshake className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  Định hướng phát triển
                </h2>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-6 text-[14.5px] leading-relaxed mb-8">
                <p className="text-stone-700 mb-3">
                  Gia phả Thường Lê sẽ tiếp tục được hoàn thiện theo hướng:
                </p>

                <ul className="space-y-2 text-stone-600 list-disc pl-5">
                  <li>
                    Hoàn thiện quản lý sự kiện gia đình, ngày giỗ, sinh nhật,
                    ngày cưới và các mốc quan trọng.
                  </li>
                  <li>
                    Nâng cấp GEDCOM import/export để trao đổi dữ liệu tốt hơn
                    với các phần mềm gia phả khác.
                  </li>
                  <li>
                    Hoàn thiện các công cụ kiểm tra chất lượng dữ liệu và repair
                    tự động.
                  </li>
                  <li>
                    Mở rộng nhắc sự kiện qua Home Assistant, Telegram hoặc lịch
                    gia đình trong tương lai.
                  </li>
                </ul>
              </div>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  Tuyên bố từ chối trách nhiệm & Quyền riêng tư
                </h2>
              </div>

              <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-6 text-[14.5px] leading-relaxed">
                <p className="font-bold text-stone-800 mb-4 bg-white py-2 px-3 rounded-lg border border-stone-200 shadow-sm inline-block">
                  Dự án này chỉ cung cấp mã nguồn và hệ thống tự triển khai.
                  Không có bất kỳ dữ liệu cá nhân nào được thu thập hay lưu trữ
                  bởi tác giả.
                </p>

                <ul className="space-y-4 text-stone-600 list-disc pl-5">
                  <li>
                    <strong className="text-stone-800">
                      Tự lưu trữ hoàn toàn:
                    </strong>{" "}
                    Khi bạn triển khai ứng dụng, toàn bộ dữ liệu gia phả như
                    tên, ngày sinh, quan hệ, sự kiện và hình ảnh được lưu trữ
                    trong tài khoản Supabase/database của chính bạn. Tác giả dự
                    án không có quyền truy cập vào database đó.
                  </li>
                  <li>
                    <strong className="text-stone-800">
                      Không thu thập dữ liệu:
                    </strong>{" "}
                    Không có analytics, không có tracking, không có telemetry,
                    không có bất kỳ hình thức thu thập thông tin người dùng nào
                    được tích hợp trong mã nguồn.
                  </li>
                  <li>
                    <strong className="text-stone-800">
                      Bạn kiểm soát dữ liệu của bạn:
                    </strong>{" "}
                    Mọi dữ liệu gia đình, thông tin thành viên và lịch sử thay
                    đổi đều nằm trong cơ sở dữ liệu do bạn tạo và quản lý. Bạn
                    có thể xóa, xuất hoặc di chuyển dữ liệu bất cứ lúc nào.
                  </li>
                  <li>
                    <strong className="text-stone-800">Demo công khai:</strong>{" "}
                    Trang demo tại{" "}
                    <code className="bg-white border border-stone-200 px-1 py-0.5 rounded text-[13px] text-amber-700">
                      demo.thuongle.net
                    </code>{" "}
                    sử dụng dữ liệu mẫu hư cấu, không chứa thông tin của người
                    thật. Không nên nhập thông tin cá nhân thật vào trang demo.
                  </li>
                </ul>
              </div>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Mail className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  Liên hệ & Góp ý
                </h2>
              </div>

              <p className="text-stone-600 leading-relaxed text-[15px] mb-8">
                Nếu bạn có thắc mắc, đề xuất tính năng, báo lỗi khi sử dụng phần
                mềm hoặc muốn thảo luận thêm về dự án, vui lòng gửi email về địa
                chỉ:{" "}
                <a
                  href="mailto:admin@thuongle.net"
                  className="font-semibold text-amber-700 hover:text-amber-600 transition-colors inline-flex items-center gap-1.5 mt-2"
                >
                  admin@thuongle.net
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}