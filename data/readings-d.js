window.READINGS = window.READINGS || [];
window.READINGS.push({
  id: 'r-tech-3',
  title: 'The Slow Death of a Working Phone',
  category: '科技',
  level: 'CET-6',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'Phones rarely fail suddenly. They age. A battery holds less charge, apps take longer to open, and updates arrive more slowly. The hardware may still work, yet the device begins to feel unusable. This is not an accident of physics alone. It is also a business model, and sometimes a strategy of planned obsolescence.',
    'Sealed batteries and glued screens make repair expensive. Parts are often serialized, so a replacement may not work without a technician. Software support ends on a schedule, leaving old handsets without security patches. Faced with a costly repair and a phone that no longer receives updates, many buyers conclude that replacement is the sensible choice.',
    'Manufacturers say a support deadline protects security and performance, and that older devices can be risky to maintain. Critics reply that support could last longer and that batteries should be replaceable. A handset that cannot receive a patch becomes a hazard by policy, not by nature. The line between worn out and switched off is drawn by companies, not by users.',
    'Regulators are beginning to demand spare parts and longer update periods. Rules, however, move slowly. The strongest pressure may come from buyers who ask a simple question before they pay: how long will this device last? Durability becomes valuable only when someone is willing to reward it.'
  ],
  translation: [
    '手机很少突然坏掉，它们是慢慢老化的。电池蓄电变少，应用打开更慢，更新也来得更迟。硬件也许还能用，但设备开始让人觉得没法用了。这不只是物理规律造成的，它也是一种商业模式，有时还是计划性淘汰策略。',
    '密封电池和胶粘屏幕让维修变得昂贵。零件往往经过序列化绑定，没有技术人员，替换件可能无法工作。软件支持按计划终止，老旧手机因此得不到安全补丁。面对昂贵的维修和不再接收更新的手机，许多消费者认定换新才是明智选择。',
    '制造商说，支持期限能保护安全与性能，并称维护旧设备有风险。批评者回应说，支持本可以更久，电池也应当可更换。一部无法获得补丁的手机，是被政策而非自然规律变成了危险品。磨损与被关停之间的界线，由公司而非用户划定。',
    '监管机构开始要求提供备件并延长更新期。但规则推进缓慢。最大的压力或许来自消费者在付款前问的一个简单问题：这台设备能用多久？只有当有人愿意为耐用性买单时，它才会变得有价值。'
  ],
  vocab: [
    { w: 'obsolescence', p: '/ˌɑːbsəˈlesns/', m: '淘汰；过时' },
    { w: 'sealed', p: '/siːld/', m: '密封的' },
    { w: 'serialized', p: '/ˈsɪriəlaɪzd/', m: '按序列号绑定的；序列化的' },
    { w: 'patch', p: '/pætʃ/', m: '软件补丁；修补程序' },
    { w: 'deadline', p: '/ˈdedlaɪn/', m: '最后期限；截止时间' },
    { w: 'replaceable', p: '/rɪˈpleɪsəbl/', m: '可更换的' },
    { w: 'hazard', p: '/ˈhæzərd/', m: '危险；隐患' },
    { w: 'durability', p: '/ˌdʊrəˈbɪləti/', m: '耐用性；持久性' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Phones usually break without warning.',
        'Phones feel obsolete because repair is costly and software support ends early.',
        'Manufacturers should stop providing security updates.',
        'Consumers always prefer replacement to repair.'
      ],
      answer: 1,
      explain: '全文说明手机并非突然损坏，而是电池衰减、维修壁垒和软件支持期限共同让设备显得过时。A 与开头相反，C 曲解了文中对安全更新的讨论，D 的 always 过于绝对。'
    },
    {
      q: 'According to the passage, why do many buyers choose a new phone instead of a repair?',
      options: [
        'Repairs are expensive and the old phone may stop receiving security updates.',
        'Regulators pay buyers to replace old devices.',
        'Old phones can no longer connect to any network.',
        'Technicians refuse to work on sealed devices.'
      ],
      answer: 0,
      explain: '第二段把原因归结为两点：维修成本高，以及软件支持结束后不再有安全补丁。B 无中生有，C 夸大其词，D 与“需要技术人员”的表述不符。'
    },
    {
      q: 'In the second paragraph, the word "patch" refers to ____.',
      options: [
        'a software fix',
        'a physical cover',
        'a price discount',
        'a legal rule'
      ],
      answer: 0,
      explain: 'patch 在软件语境中指修复漏洞的补丁。该段说旧手机得不到 security patches，第三段又说收不到 patch 就会变成隐患，均指软件修复程序。'
    }
  ]
});
window.READINGS.push({
  id: 'r-tech-4',
  title: 'When Data Centers Drink',
  category: '科技',
  level: 'IELTS',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'The cloud feels weightless. In practice it rests on a warehouse filled with servers, and each server produces heat. Cooling systems keep them working, and some of the cheapest systems use evaporative cooling, which consumes water. A data center can therefore draw water steadily, even in a dry month, while nearby households are asked to cut back.',
    'Operators build where land and power are cheap, and they value a predictable supply. Towns often welcome the investment and the tax revenue. Yet a large facility can draw from the same aquifer that feeds local farms and gardens. Residents begin to ask who has priority when the reservoir falls.',
    'Some companies promise to replenish more water than they use. The accounting is contested. Credits may pay for repairs in another watershed, or for projects that would have happened anyway. Efficiency improvements help, but demand for computing keeps rising, and a smaller footprint per machine can still mean a larger footprint overall.',
    'Better rules would require disclosure of water use, careful siting, and cooling designs that fit the local climate. The cloud can be part of a clean economy, but only when its physical costs are counted. A service that feels invisible is still made of pipes, power and place.'
  ],
  translation: [
    '云感觉没有重量。实际上，它依托于装满服务器的仓库，而每台服务器都会发热。冷却系统让它们持续运转，一些最廉价的系统采用蒸发冷却，会消耗水。因此，一座数据中心即使在干旱月份也可能稳定取水，而附近家庭却被要求减少用水。',
    '运营商会选择土地和电力便宜的地方，并看重稳定的供给。城镇往往欢迎投资和税收。但大型设施可能从同一片含水层取水，而当地农场和花园也依赖它。居民开始追问：水库水位下降时，谁有优先权？',
    '一些公司承诺回补的水多于使用量。这套算法存在争议。额度可能用于另一个流域的修复，也可能用于本来就会发生的项目。效率提升有帮助，但对算力的需求持续上升，单台机器的足迹变小，总足迹仍可能变大。',
    '更好的规则应要求披露用水、审慎选址，并采用适应当地气候的冷却设计。云可以成为清洁经济的一部分，但前提是它的实体成本被计算在内。一项感觉无形的服务，仍然由管道、电力和具体地点构成。'
  ],
  vocab: [
    { w: 'warehouse', p: '/ˈwerhaʊs/', m: '仓库；大型厂房' },
    { w: 'server', p: '/ˈsɜːrvər/', m: '服务器' },
    { w: 'evaporative', p: '/ɪˈvæpəreɪtɪv/', m: '蒸发的；蒸发式的' },
    { w: 'aquifer', p: '/ˈækwɪfər/', m: '含水层' },
    { w: 'replenish', p: '/rɪˈplenɪʃ/', m: '补充；回补' },
    { w: 'watershed', p: '/ˈwɔːtərʃed/', m: '流域；集水区' },
    { w: 'contested', p: '/kənˈtestɪd/', m: '有争议的' },
    { w: 'disclosure', p: '/dɪsˈkloʊʒər/', m: '披露；公开' },
    { w: 'siting', p: '/ˈsaɪtɪŋ/', m: '选址' },
    { w: 'footprint', p: '/ˈfʊtprɪnt/', m: '足迹；影响范围' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Cloud services consume no physical resources.',
        'Data centers should be banned in every dry region.',
        'The water use of data centers is a real local cost that needs disclosure and better siting.',
        'Companies always replenish more water than they consume.'
      ],
      answer: 2,
      explain: '文章从云服务的实体资源讲起，指出数据中心耗水与地方水源之间的冲突，最后主张披露用水、审慎选址。A 与全文相反，B 过于绝对，D 与“算法存在争议”矛盾。'
    },
    {
      q: 'Why is the accounting of water replenishment described as contested?',
      options: [
        'Because no company has ever measured water use.',
        'Because credits may support distant projects or work that would have happened anyway.',
        'Because local farms refuse to report their consumption.',
        'Because evaporative cooling uses no water at all.'
      ],
      answer: 1,
      explain: '第三段说明争议在于回补额度的去向：可能资助另一个流域，也可能资助本来就会发生的项目，因此未必抵消当地水源压力。A、C 无中生有，D 与第二句相反。'
    },
    {
      q: 'In the third paragraph, the word "replenish" is closest in meaning to ____.',
      options: [
        'measure exactly',
        'sell quickly',
        'restore what was used',
        'avoid completely'
      ],
      answer: 2,
      explain: 'replenish 意为补充、回补。文中说公司承诺回补的水多于使用量，即把消耗掉的水资源恢复回来，而不是测量、出售或完全避免使用。'
    }
  ]
});
window.READINGS.push({
  id: 'r-econ-3',
  title: 'The Rent Squeeze Beyond the Big Cities',
  category: '经济',
  level: '考研',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'For years, ambitious young people left small cities for a large metro. Remote work has reversed part of that flow. New arrivals can keep big-city salaries while paying small-town rents, at least for a while. Demand rises faster than construction, and the gap is filled by higher prices rather than more homes.',
    'Landlords can charge what the market will bear. Local wages do not move at the same speed. Teachers, nurses and service workers face longer commutes or leave altogether. A rental market that was affordable because few people wanted to live there becomes expensive because some people can work from anywhere.',
    'Building in small places is harder than it looks. A contractor is harder to find, water pipes are older, and planning departments are thin. Investors buy the existing stock, which raises prices without adding a single unit. Restrictions designed to protect a town from growth can also protect it from newcomers.',
    'The remedy is not to stop migration. It is to prepare for it: fund infrastructure, allow modest density, protect a tenant during the transition, and collect better data on vacancy and wages. A city that offers no room to newcomers will eventually lose the workers it needs to function.'
  ],
  translation: [
    '多年来，有抱负的年轻人离开小城市，前往大都市。远程办公逆转了部分人流。新来者可以保留大城市的薪水，同时支付小城镇的房租，至少能维持一段时间。需求增长快于建设，缺口由更高的价格填补，而不是更多的住房。',
    '房东会按市场能承受的水平收租。当地工资却不会以同样速度上涨。教师、护士和服务业劳动者面临更长的通勤，或者干脆离开。一个曾因少有人愿意居住而便宜的租赁市场，如今因一些人可以在任何地方工作而变得昂贵。',
    '在小地方建房比看起来更难。承包商更难找，水管更旧，规划部门人手不足。投资者购买现有存量房，这在没有增加一套住房的情况下抬高了价格。旨在保护小镇免于增长的限制，也可能把新来者挡在门外。',
    '解决办法不是阻止迁移，而是为迁移做准备：投资基础设施，允许适度的密度，在过渡期保护租户，并收集更完善的空置率和工资数据。一座不给新来者留出空间的城市，最终会失去它运转所需的劳动者。'
  ],
  vocab: [
    { w: 'metro', p: '/ˈmetroʊ/', m: '大都市；大城市' },
    { w: 'remote', p: '/rɪˈmoʊt/', m: '远程的；偏远的' },
    { w: 'contractor', p: '/ˈkɑːntræktər/', m: '承包商；施工方' },
    { w: 'infrastructure', p: '/ˈɪnfrəstrʌktʃər/', m: '基础设施' },
    { w: 'density', p: '/ˈdensəti/', m: '密度' },
    { w: 'tenant', p: '/ˈtenənt/', m: '租户；房客' },
    { w: 'transition', p: '/trænˈzɪʃn/', m: '过渡；转变' },
    { w: 'migration', p: '/maɪˈɡreɪʃn/', m: '迁移；人口流动' },
    { w: 'stock', p: '/stɑːk/', m: '存量；现有房屋' },
    { w: 'affordable', p: '/əˈfɔːrdəbl/', m: '负担得起的' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Remote workers have made small cities uninhabitable.',
        'Rising rents in smaller cities reflect new demand and require more housing and infrastructure.',
        'Local wages always rise as fast as rents.',
        'Migration to small cities should be stopped by law.'
      ],
      answer: 1,
      explain: '文章说明远程办公给小城市带来新需求，房租上涨而工资未同步，解决之道是增加住房、投资基础设施并保护租户。A 夸大后果，C 与第二段相反，D 与末段明确反对。'
    },
    {
      q: 'According to the passage, why is construction difficult in small places?',
      options: [
        'There are too many contractors and too much planning capacity.',
        'Investors are not allowed to buy existing homes.',
        'Contractors are scarce, pipes are old and planning departments are thin.',
        'Newcomers refuse to live in newly built housing.'
      ],
      answer: 2,
      explain: '第三段列出三个具体障碍：承包商难找、水管老化、规划部门人手不足。A 与原文相反，B、D 均无依据。'
    },
    {
      q: 'In the third paragraph, the word "stock" refers to ____.',
      options: [
        'the housing that already exists',
        'building materials held in a shop',
        'the number of new residents',
        'a company share traded on a market'
      ],
      answer: 0,
      explain: 'existing stock 在住房语境中指现有存量房。文中说投资者购买存量房，只抬高价格而不增加住房单元，因此不是商店库存、人口数量或股票。'
    }
  ]
});
window.READINGS.push({
  id: 'r-econ-4',
  title: 'The Long Road Home for Supply Chains',
  category: '经济',
  level: 'TOEFL',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'For decades, firms searched for the lowest cost and spread production across borders. A pandemic and a shipping disruption exposed the fragility of that arrangement. Many companies now speak of reshoring, or moving production closer to home, and of choosing suppliers in friendly countries.',
    'Proximity can shorten lead times and reduce exposure to distant shocks. It also raises costs. The supplier may not exist nearby, and the skills needed to run a factory have withered. Building a plant takes years; training a workforce takes longer. Governments eager to speed the process offer subsidies.',
    'A subsidy can turn a strategic goal into a contest for handouts, with firms threatening to leave unless they are paid to stay. Consumers say they value resilience, yet they resist paying more for it. The result is a gap between what is promised and what is purchased.',
    'A sensible policy does not aim to make everything at home. It can diversify critical inputs, keep buffer stocks, and map each tier of suppliers behind a product. Resilience is a form of insurance, and insurance carries a premium. The question is how much cover a society wants, and who should pay for it.'
  ],
  translation: [
    '几十年来，企业寻找最低成本，把生产分散到各国。一场疫情和一次航运中断暴露了这种安排的脆弱性。许多公司现在谈论回流，也就是把生产迁回更近的地方，并谈论在友好国家选择供应商。',
    '靠近市场可以缩短交货时间，减少对遥远冲击的暴露。它也会抬高成本。供应商可能在附近并不存在，经营工厂所需的技能已经萎缩。建一座工厂需要数年，培养一支劳动力需要更久。急于加快进程的政府会提供补贴。',
    '补贴可能把战略目标变成一场争夺施舍的竞赛，企业威胁说，除非拿到钱留下，否则就会离开。消费者说重视韧性，却不愿为此多付钱。结果就是承诺与购买之间的落差。',
    '明智的政策并不追求把所有东西都放在国内生产。它让关键投入多元化，保留缓冲库存，并厘清一件产品背后的每一层供应商。韧性是一种保险，而保险有保费。问题在于社会想要多少保障，以及应由谁来支付。'
  ],
  vocab: [
    { w: 'reshoring', p: '/ˌriːˈʃɔːrɪŋ/', m: '回流；把生产迁回本国或近处' },
    { w: 'fragility', p: '/frəˈdʒɪləti/', m: '脆弱性' },
    { w: 'disruption', p: '/dɪsˈrʌpʃn/', m: '中断；扰乱' },
    { w: 'supplier', p: '/səˈplaɪər/', m: '供应商' },
    { w: 'subsidy', p: '/ˈsʌbsədi/', m: '补贴；津贴' },
    { w: 'diversify', p: '/daɪˈvɜːrsɪfaɪ/', m: '使多样化' },
    { w: 'buffer', p: '/ˈbʌfər/', m: '缓冲；缓冲物' },
    { w: 'tier', p: '/tɪr/', m: '层级；层' },
    { w: 'resilience', p: '/rɪˈzɪliəns/', m: '韧性；恢复力' },
    { w: 'premium', p: '/ˈpriːmiəm/', m: '保费；额外费用' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Firms should move all production back home immediately.',
        'Resilience means avoiding international trade completely.',
        'Supply chains can be made more resilient, but the insurance costs money and requires choices.',
        'Consumers are willing to pay any price for local goods.'
      ],
      answer: 2,
      explain: '文章承认回流能降低部分风险，但强调成本、技能和政府补贴带来的问题，最后把韧性比作需要支付保费的保险。A、B 过于极端，D 与第三段相反。'
    },
    {
      q: 'According to the passage, why can moving production closer raise costs?',
      options: [
        'Suppliers and skills may be missing, and building plants and training workers take time.',
        'Distant shipping is always cheaper than local production.',
        'Governments forbid firms from training workers.',
        'Consumers refuse to buy products made nearby.'
      ],
      answer: 0,
      explain: '第二段指出附近可能没有供应商，相关技能萎缩，建厂和培训都耗时，因此成本上升。B 的 always 无依据，C 与政府提供补贴相反，D 无中生有。'
    },
    {
      q: 'In the last paragraph, the word "premium" is closest in meaning to ____.',
      options: [
        'a formal ceremony',
        'a legal penalty',
        'a rare material',
        'an extra cost'
      ],
      answer: 3,
      explain: 'premium 在保险语境中指甲方向保险公司支付的保费，引申为为获得保障而付出的额外成本。文中 insurance carries a premium 正是此意。'
    }
  ]
});
window.READINGS.push({
  id: 'r-econ-5',
  title: 'The Uneven Pay of Gig Work',
  category: '经济',
  level: 'GRE',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'The promise of gig work is control. Workers choose their hours, accept the tasks they want, and imagine themselves as independent operators. The reality is more entangled. Platforms set prices, rank workers through opaque ratings, and can deactivate an account without a hearing. Flexibility is genuine, but so is dependence.',
    'Earnings fluctuate with demand, weather and the whims of an algorithm. Workers bear costs that employees rarely see: vehicles, insurance, repairs, and long stretches of unpaid downtime. A tempting hourly rate can conceal the hours spent waiting for the next job.',
    'The classification of a worker as a contractor lowers labor costs and shifts risk onto the individual. Some workers prize that status; others want minimum standards and a collective voice. The debate is often framed as flexibility versus security, as if the two were mutually exclusive. Most workers would prefer both.',
    'Possible remedies include portable benefits, transparent algorithms, and sectoral bargaining. None is a complete answer, and each creates new questions about who pays. But all treat gig work as work rather than as a clever app. That shift in framing is the precondition for any serious reform.'
  ],
  translation: [
    '零工工作的承诺是掌控感。劳动者选择工作时间，接受想做的任务，并把自己想象成独立的经营者。现实更加纠缠。平台定价、通过不透明的评分给劳动者排序，并能在没有听证的情况下停用账户。灵活性是真实的，依赖也是真实的。',
    '收入随需求、天气和算法的任性而波动。劳动者承担雇员很少看到的成本：车辆、保险、维修，以及长时间无薪的等待。一个诱人的时薪，可能掩盖了等待下一单所花的时间。',
    '把劳动者归类为承包商，降低了劳动力成本，也把风险转嫁给个人。一些劳动者珍视这种身份；另一些人想要最低标准和集体发声。争论常被框定为灵活性与保障的对立，仿佛二者互不相容。多数劳动者宁愿两者兼得。',
    '可能的补救包括可携带福利、透明的算法和行业性集体谈判。没有一种方案是完整答案，每一种都会带来由谁支付的新问题。但它们都把零工当作工作，而不是一个聪明的应用。这种框架转变，是任何严肃改革的前提。'
  ],
  vocab: [
    { w: 'opaque', p: '/oʊˈpeɪk/', m: '不透明的；难以理解的' },
    { w: 'deactivate', p: '/ˌdiːˈæktɪveɪt/', m: '停用；使失效' },
    { w: 'dependence', p: '/dɪˈpendəns/', m: '依赖；依靠' },
    { w: 'fluctuate', p: '/ˈflʌktʃueɪt/', m: '波动；起伏' },
    { w: 'downtime', p: '/ˈdaʊntaɪm/', m: '停机时间；无工作可做的时间' },
    { w: 'contractor', p: '/ˈkɑːntræktər/', m: '承包商；独立承包人' },
    { w: 'portable', p: '/ˈpɔːrtəbl/', m: '可携带的；可转移的' },
    { w: 'sectoral', p: '/ˈsektərəl/', m: '行业的；部门性的' },
    { w: 'bargaining', p: '/ˈbɑːrɡənɪŋ/', m: '谈判；集体谈判' },
    { w: 'classification', p: '/ˌklæsɪfɪˈkeɪʃn/', m: '分类；归类' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Gig work always provides more security than employment.',
        'Gig work offers flexibility but shifts risk to workers, so new standards are needed.',
        'Platforms should set wages without any public oversight.',
        'Most gig workers prefer to work without pay.'
      ],
      answer: 1,
      explain: '文章承认零工工作有时间灵活的一面，但重点在平台控制、收入波动和成本转嫁，最后主张可携带福利、透明算法与集体谈判。A 与事实相反，C 与监管思路相反，D 无依据。'
    },
    {
      q: 'According to the passage, which costs do gig workers often bear?',
      options: [
        'Only the cost of a smartphone.',
        'Costs that platforms are required to cover in full.',
        'Vehicles, insurance, repairs and unpaid waiting time.',
        'Nothing, because contractors receive full benefits.'
      ],
      answer: 2,
      explain: '第二段列举了车辆、保险、维修和长时间无薪等待等成本，并指出这些是雇员很少直接承担的开支。A 以偏概全，B、D 与原文相反。'
    },
    {
      q: 'In the first paragraph, the word "opaque" is closest in meaning to ____.',
      options: [
        'difficult to understand',
        'completely fair',
        'easy to predict',
        'legally protected'
      ],
      answer: 0,
      explain: 'opaque 本义为不透明，此处形容评分机制不公开、难以理解。后文说平台可无听证停用账户，进一步说明这种不透明带来的权力不对等。'
    }
  ]
});
window.READINGS.push({
  id: 'r-cul-3',
  title: 'The Comeback of a Mother Tongue',
  category: '文化',
  level: 'CET-4',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'A generation ago, many children were told to leave their local dialect at the school gate. It was treated as backward, a barrier to standard speech. Today some of those children are trying to learn it back. They post short videos, sing old songs, and ask grandparents to record stories before it is too late.',
    'The revival is visible in small places: cafe menus, radio programs, wedding speeches. A linguist welcomes the attention but warns that a language needs daily use, not only performance. A phrasebook cannot replace a playground. If young people do not argue, joke and shop in the language, it remains a souvenir.',
    'Schools can help by inviting elders into classrooms and treating local speech as heritage rather than error. Media matter too, through a subtitle or dubbing. Yet prestige changes slowly. A dialect that is mocked in one generation may be admired as charming in the next, but admiration is not the same as use.',
    'The goal need not be to replace the standard language. It is to let both live, so that a child can switch codes without shame. A mother tongue is not a museum piece. It is a way of belonging, and belonging needs company.'
  ],
  translation: [
    '一代人以前，许多孩子被告知要把当地方言留在校门口。它被视为落后，是通往标准语言的障碍。如今，其中一些孩子正试图把它学回来。他们发短视频、唱老歌，并请祖辈在为时未晚之前录下故事。',
    '这场复兴体现在小地方：咖啡馆菜单、广播节目、婚礼致辞。一位语言学家欢迎这种关注，但警告说，一种语言需要日常使用，而不只是表演。一本短语手册无法替代操场。如果年轻人不用这种语言争论、开玩笑和购物，它就仍然只是一件纪念品。',
    '学校可以通过请长辈进课堂、把本地话当作遗产而非错误来提供帮助。媒体也很重要，可以通过字幕或配音。但声望改变得很慢。一代人被嘲笑的方言，下一代人可能觉得它迷人，但欣赏并不等于使用。',
    '目标不必是取代标准语言，而是让两者都存活，让孩子可以不带羞耻地切换语码。母语不是博物馆展品。它是一种归属方式，而归属需要同伴。'
  ],
  vocab: [
    { w: 'dialect', p: '/ˈdaɪəlekt/', m: '方言' },
    { w: 'barrier', p: '/ˈbæriər/', m: '障碍；壁垒' },
    { w: 'revival', p: '/rɪˈvaɪvl/', m: '复兴；复苏' },
    { w: 'linguist', p: '/ˈlɪŋɡwɪst/', m: '语言学家' },
    { w: 'heritage', p: '/ˈherɪtɪdʒ/', m: '遗产；传统' },
    { w: 'subtitle', p: '/ˈsʌbtaɪtl/', m: '字幕' },
    { w: 'prestige', p: '/preˈstiːʒ/', m: '声望；威信' },
    { w: 'belonging', p: '/bɪˈlɔːŋɪŋ/', m: '归属感；属于' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Local dialects should be banned in schools.',
        'A dialect revival needs daily use and social respect, not only performances.',
        'Standard languages are no longer useful to young people.',
        'Grandparents are the only people who can save a language.'
      ],
      answer: 1,
      explain: '文章肯定短视频、歌曲等复兴形式，但反复强调语言需要日常使用和社会声望，不能只停留在表演层面。A 与文章态度相反，C 无依据，D 把长辈的作用绝对化。'
    },
    {
      q: 'What do linguists warn about the revival?',
      options: [
        'It is impossible to record older speakers.',
        'Short videos are more useful than classrooms.',
        'Cafe menus are the best way to teach grammar.',
        'Attention without daily use leaves the language as a souvenir.'
      ],
      answer: 3,
      explain: '第二段明确说，语言学家欢迎关注，但警告语言需要日常使用；如果年轻人不用它争论、开玩笑和购物，它就只是纪念品。A 与文中录故事相反，B、C 均非语言学家观点。'
    },
    {
      q: 'In the third paragraph, the word "prestige" is closest in meaning to ____.',
      options: [
        'a school rule',
        'a musical style',
        'social respect and status',
        'a written record'
      ],
      answer: 2,
      explain: 'prestige 指声望、社会地位。文中说 prestige changes slowly，并与方言被嘲笑或被欣赏相联系，说明它指的是社会评价，而非校规、音乐风格或文字记录。'
    }
  ]
});
window.READINGS.push({
  id: 'r-cul-4',
  title: 'Street Food and the City That Never Sits Still',
  category: '文化',
  level: 'CET-6',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'Street food is often called the soul of a city, but the phrase can hide the work behind it. A stall is a small business with a thin margin, long hours and no cushion. Its operator reads the street the way an editor reads a page: where people walk, when they are hungry, and what they will pay.',
    'Cities face a trade-off. A vendor makes public space lively and affordable, yet can block a pavement, compete with a restaurant that pays rent, and complicate hygiene rules. Heavy-handed licensing can push vendors out. No rules at all can produce noise, waste and conflict.',
    'The best schemes treat vendors as urban infrastructure. Designated zones, shared kitchens, transparent fees and a realistic inspection help. So does giving vendors a voice in decisions that affect them. Regulation should make good practices cheap and bad practices expensive, not make survival a lottery.',
    'When a city loses its street food, it loses more than lunch. It loses a meeting place where incomes are small, portions are generous, and strangers share a table. A food hall can imitate the menu. It cannot easily imitate the street.'
  ],
  translation: [
    '街头小吃常被称为城市的灵魂，但这个说法可能掩盖了背后的劳动。一个摊位是一门小生意，利润微薄，工时很长，没有缓冲。摊主读街道，就像编辑读一页稿子：人们在哪里走，什么时候饿，愿意付多少钱。',
    '城市面临取舍。摊贩让公共空间热闹而便宜，却也可能堵住人行道，与付租金的餐馆竞争，并让卫生规则更复杂。苛刻的许可制度会把摊贩挤走。完全不管，则会带来噪音、垃圾和冲突。',
    '最好的方案把摊贩当作城市基础设施。划定区域、共享厨房、透明收费和切合实际的检查都有帮助。让摊贩在影响他们的决策中有发言权，同样有帮助。监管应让良好做法成本低、不良做法成本高，而不是让生存变成抽奖。',
    '一座城市失去街头小吃，失去的不只是午餐。它失去一个聚会场所：那里收入不高，分量慷慨，陌生人共享一张桌子。美食广场可以模仿菜单，却不容易模仿街道。'
  ],
  vocab: [
    { w: 'stall', p: '/stɔːl/', m: '摊位；货摊' },
    { w: 'margin', p: '/ˈmɑːrdʒɪn/', m: '利润；差额' },
    { w: 'vendor', p: '/ˈvendər/', m: '摊贩；小贩' },
    { w: 'pavement', p: '/ˈpeɪvmənt/', m: '人行道' },
    { w: 'hygiene', p: '/ˈhaɪdʒiːn/', m: '卫生' },
    { w: 'licensing', p: '/ˈlaɪsənsɪŋ/', m: '许可制度；发放执照' },
    { w: 'designated', p: '/ˈdezɪɡneɪtɪd/', m: '指定的；划定的' },
    { w: 'inspection', p: '/ɪnˈspekʃn/', m: '检查；视察' },
    { w: 'infrastructure', p: '/ˈɪnfrəstrʌktʃər/', m: '基础设施' },
    { w: 'generous', p: '/ˈdʒenərəs/', m: '慷慨的；分量足的' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Street food should be replaced by food halls.',
        'Cities should treat street vendors as urban infrastructure and regulate them thoughtfully.',
        'Vendors should not pay any fees or follow hygiene rules.',
        'Street food is only important for tourists.'
      ],
      answer: 1,
      explain: '文章既肯定街头小吃的公共价值，也承认占道、卫生和竞争问题，主张用划定区域、共享厨房、透明收费等精细规则来管理。A 与结尾相反，C 走另一极端，D 无依据。'
    },
    {
      q: 'What trade-off do cities face with street food?',
      options: [
        'Vendors add life and affordable food but can block pavements and complicate hygiene.',
        'Vendors pay too much rent to restaurants.',
        'Street food is always cleaner than restaurant food.',
        'Vendors refuse to serve local residents.'
      ],
      answer: 0,
      explain: '第二段开头即提出取舍：摊贩让公共空间有活力、食物便宜，但可能堵人行道、与餐馆竞争并增加卫生管理难度。B 主客颠倒，C 的 always 无依据，D 无中生有。'
    },
    {
      q: 'In the first paragraph, the word "margin" refers to ____.',
      options: [
        'the edge of a page',
        'a legal permission',
        'the difference between cost and selling price',
        'a type of street sign'
      ],
      answer: 2,
      explain: '在商业语境中，margin 指利润空间或成本与售价之间的差额。文中说摊位利润微薄、工时长、没有缓冲，说明这里谈的是经济利润，而非页边距或执照。'
    }
  ]
});
window.READINGS.push({
  id: 'r-edu-3',
  title: 'Learning a Trade Without the Lecture Hall',
  category: '教育',
  level: 'CET-4',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'For decades, many parents treated a university degree as the only respectable route. Vocational schools were a backup, not a first choice. That hierarchy is being questioned as employers struggle to find a welder, an electrician or a care worker. The shortage is not only a number. It is a signal that the status system has stopped matching the work that needs doing.',
    'An apprenticeship combines paid work with classroom study. It suits people who learn by doing and allows firms to train the workers they need. But quality varies. Some programs teach real skills and offer a qualification. Others use young people as cheap labor and call it experience.',
    'Status is part of the problem. Pay and conditions in skilled trades often lag behind professional jobs, and careers advice repeats an old prejudice. Countries that treat vocational training as rigorous and portable do better. Their students can move between industries, and their qualifications are recognized beyond one employer.',
    'The answer is not to push everyone toward a trade, or everyone toward a degree. It is to build several respected paths, with bridges between them. A good education system does not rank minds. It gives them room.'
  ],
  translation: [
    '几十年来，许多父母把大学学位视为唯一体面的道路。职业学校是备选，而不是首选。随着雇主难以找到焊工、电工或护理员，这种等级观念正受到质疑。短缺不只是一个数字，它是一个信号：地位体系已经无法匹配需要完成的工作。',
    '学徒制把带薪工作与课堂学习结合起来。它适合通过动手来学习的人，也让企业培养自己需要的劳动者。但质量参差不齐。一些项目教授真正的技能并提供资格认证；另一些则把年轻人当作廉价劳动力，还称之为经验。',
    '地位是问题的一部分。技术行业的薪酬和条件往往落后于专业岗位，职业指导也在重复旧的偏见。那些把职业培训视为严谨且可迁移的国家做得更好。他们的学生可以在行业间流动，资格也能得到不止一个雇主的认可。',
    '答案不是把所有人推向一门手艺，也不是把所有人推向一个学位。而是建立若干受尊重的路径，并在它们之间架桥。好的教育体系不给头脑排名，而是给它们空间。'
  ],
  vocab: [
    { w: 'vocational', p: '/voʊˈkeɪʃənl/', m: '职业的；职业培训的' },
    { w: 'apprenticeship', p: '/əˈprentɪʃɪp/', m: '学徒期；学徒制' },
    { w: 'hierarchy', p: '/ˈhaɪrɑːrki/', m: '等级制度；层级' },
    { w: 'welder', p: '/ˈweldər/', m: '焊工' },
    { w: 'rigorous', p: '/ˈrɪɡərəs/', m: '严格的；严谨的' },
    { w: 'portable', p: '/ˈpɔːrtəbl/', m: '可迁移的；通用的' },
    { w: 'prejudice', p: '/ˈpredʒudɪs/', m: '偏见' },
    { w: 'trade', p: '/treɪd/', m: '手艺；行业' },
    { w: 'backup', p: '/ˈbækʌp/', m: '备选；后备' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'University degrees should be abolished.',
        'Vocational education is only suitable for weak students.',
        'Employers no longer need skilled workers.',
        'Education systems should offer several respected paths rather than rank minds.'
      ],
      answer: 3,
      explain: '文章批评把大学视为唯一出路的等级观念，主张建设多条受尊重的教育路径，并在它们之间架桥。A 走极端，B 正是文章批评的偏见，C 与技工短缺相反。'
    },
    {
      q: 'What problem with apprenticeships does the passage mention?',
      options: [
        'They never combine work with study.',
        'Quality varies, and some programs use young people as cheap labor.',
        'They are only available to university graduates.',
        'They always pay more than professional jobs.'
      ],
      answer: 1,
      explain: '第二段先肯定学徒制把带薪工作与课堂学习结合，随后指出质量参差，有些项目把年轻人当廉价劳动力。A 与定义相反，C、D 均无依据。'
    },
    {
      q: 'In the third paragraph, the word "portable" is closest in meaning to ____.',
      options: [
        'recognized and usable in different places',
        'easy to carry in a pocket',
        'limited to one employer',
        'expensive to obtain'
      ],
      answer: 0,
      explain: 'portable 在此指资格和技能可迁移、能在不同行业和雇主之间使用，而非字面上的便于携带。后文“资格得到不止一个雇主认可”正是对这个词的解释。'
    }
  ]
});
window.READINGS.push({
  id: 'r-edu-4',
  title: 'When a Tutor Never Sleeps',
  category: '教育',
  level: 'IELTS',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'A student stuck on algebra at midnight can now ask a chatbot for help. It answers instantly, patiently, and in any language. For families who cannot afford private tutors, that is a genuine change. The promise is not merely convenience. It is a form of access.',
    'The technology has limits. A model may sound confident and still be wrong. It may do the work rather than build understanding. It can mirror the bias of its training data or reward the student who guesses well. Without a teacher, mistakes can be repeated until they feel like knowledge.',
    'Schools are experimenting with a guardrail: a teacher-reviewed prompt, a transcript, and assignments that ask for reasoning. The best use frees teachers from repetitive explanation so they can notice confusion and build motivation. A chatbot can answer the question. A teacher can decide which question matters next.',
    'Access matters as much as accuracy. A tool that requires fast internet and a paid subscription widens gaps. The promise of a tutor that never sleeps is real, but only if the sleep-deprived student can reach it. Technology does not remove inequality. It rearranges it.'
  ],
  translation: [
    '一个半夜被代数题困住的学生，现在可以向聊天机器人求助。它即时、耐心地回答，而且可以用任何语言。对于请不起私人辅导的家庭来说，这是真正的改变。承诺不只是便利，它是一种获取机会的形式。',
    '这项技术有局限。一个模型可能听起来很自信，却仍然是错的。它可能替学生做题，而不是帮助其理解。它会复制训练数据中的偏见，或者奖励猜得好的学生。没有老师，错误可能被重复，直到它们感觉像知识。',
    '学校正在试验一种护栏：由教师审阅的提示词、一份记录，以及要求说明推理过程的作业。最好的用法把教师从重复讲解中解放出来，让他们能发现困惑并激发动力。聊天机器人可以回答这个问题，老师则能决定下一个该问哪个问题。',
    '可及性与准确性同样重要。一种需要高速网络和付费订阅的工具会扩大差距。一个永不睡觉的辅导者，这个承诺是真实的，但前提是那个缺觉的学生能够接触到它。技术不会消除不平等，它会重新安排不平等。'
  ],
  vocab: [
    { w: 'chatbot', p: '/ˈtʃætbɑːt/', m: '聊天机器人' },
    { w: 'algebra', p: '/ˈældʒəbrə/', m: '代数' },
    { w: 'confident', p: '/ˈkɑːnfɪdənt/', m: '自信的；有把握的' },
    { w: 'bias', p: '/ˈbaɪəs/', m: '偏见；偏差' },
    { w: 'guardrail', p: '/ˈɡɑːrdreɪl/', m: '护栏；防护措施' },
    { w: 'prompt', p: '/prɑːmpt/', m: '提示词；提示' },
    { w: 'transcript', p: '/ˈtrænskrɪpt/', m: '记录；文字稿' },
    { w: 'subscription', p: '/səbˈskrɪpʃn/', m: '订阅；订阅费' },
    { w: 'motivation', p: '/ˌmoʊtɪˈveɪʃn/', m: '动力；积极性' },
    { w: 'access', p: '/ˈækses/', m: '获取机会；使用权' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'AI tutors have made human teachers unnecessary.',
        'AI tutors can widen access, but they need guardrails and fair access to be useful.',
        'Students should never use chatbots for homework.',
        'Private tutors are always better than any software.'
      ],
      answer: 1,
      explain: '文章肯定聊天机器人能为请不起家教的学生提供帮助，同时指出错误、替代思考和不平等获取等风险，主张设置护栏并关注可及性。A、C 过于绝对，D 与文章对可及性的肯定不符。'
    },
    {
      q: 'What is one risk of AI tutoring mentioned in the passage?',
      options: [
        'It refuses to answer questions in other languages.',
        'It can only work during school hours.',
        'It may do the work for students rather than build understanding.',
        'It cannot produce wrong answers.'
      ],
      answer: 2,
      explain: '第二段指出模型可能替学生完成工作而不帮助其理解，还可能自信地给出错误答案。A、B 与“即时、任何语言”相反，D 与“仍然可能是错的”矛盾。'
    },
    {
      q: 'In the third paragraph, the word "guardrail" is closest in meaning to ____.',
      options: [
        'a decorative wall',
        'a paid subscription',
        'a difficult exam',
        'a limit that keeps use safe'
      ],
      answer: 3,
      explain: 'guardrail 本义是道路护栏，这里比喻防止技术被误用的保护措施。冒号后列出的教师审阅提示词、记录和推理作业，正是这种限制与保障。'
    }
  ]
});
window.READINGS.push({
  id: 'r-soc-2',
  title: 'Living Alone, Together',
  category: '社会',
  level: '考研',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'More people than ever live alone, and not all of them are lonely. Solo living can be a stage of life, a preference, or a response to high rents and a delayed partnership. The category hides very different experiences. A young professional in a city center and a widower in a village may share an address type and nothing else.',
    'What matters is whether solitude is chosen and whether connection remains easy. A studio flat on a busy street may be less isolating than a suburban house behind a fence. Public spaces, libraries, cafes and reliable transport become social infrastructure. They turn private life into something that can open outward.',
    'Policy often assumes a household of four. Tax codes, housing rules and service design can penalize single people or neglect them. Older men living alone, in particular, may lack the networks that others take for granted. The risk is not solitude itself but solitude without a safety net.',
    'The task is not to push everyone into a couple or a crowd. It is to make room for solitude without abandonment: homes that can adapt, neighborhoods that invite contact, and services that check in but do not intrude. Living alone should be a choice, not a sentence.'
  ],
  translation: [
    '独居的人比以往任何时候都多，但他们并非都孤独。独居可以是人生的一个阶段、一种偏好，也可以是对高房租和延迟伴侣关系的回应。这个类别掩盖了非常不同的经历。住在市中心的一位年轻职场人士和住在村庄里的一位鳏夫，可能只共享一种住址类型，别无其他。',
    '关键在于独处是否是主动选择，以及连接是否仍然容易。繁忙街道上的一间单间公寓，可能比围栏后的郊区住宅更不孤立。公共空间、图书馆、咖啡馆和可靠的交通成为社会基础设施。它们让私人生活能够向外打开。',
    '政策往往假定一个四口之家。税法、住房规则和服务设计可能惩罚单身者，或者忽视他们。尤其是独居的老年男性，可能缺乏别人习以为常的关系网络。风险不在于独处本身，而在于没有安全网的独处。',
    '任务不是把每个人推入伴侣关系或人群，而是在不遗弃的前提下为独处留出空间：能够调整的住宅、邀请接触的社区，以及会探望但不侵入的服务。独居应当是一种选择，而不是一句判决。'
  ],
  vocab: [
    { w: 'solitude', p: '/ˈsɑːlətuːd/', m: '独处；孤独' },
    { w: 'isolating', p: '/ˈaɪsəleɪtɪŋ/', m: '使人孤立的' },
    { w: 'infrastructure', p: '/ˈɪnfrəstrʌktʃər/', m: '基础设施' },
    { w: 'household', p: '/ˈhaʊshoʊld/', m: '家庭；一户人家' },
    { w: 'penalize', p: '/ˈpiːnəlaɪz/', m: '惩罚；使处于不利地位' },
    { w: 'abandonment', p: '/əˈbændənmənt/', m: '遗弃；抛弃' },
    { w: 'intrude', p: '/ɪnˈtruːd/', m: '侵入；打扰' },
    { w: 'partnership', p: '/ˈpɑːrtnərʃɪp/', m: '伴侣关系；伙伴关系' },
    { w: 'preference', p: '/ˈprefrəns/', m: '偏好；选择' },
    { w: 'adapt', p: '/əˈdæpt/', m: '适应；调整' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Solo living takes different forms, and cities should support connection without forcing it.',
        'Living alone always causes loneliness.',
        'Single people should pay higher taxes.',
        'Everyone should live in a household of four.'
      ],
      answer: 0,
      explain: '文章区分了主动独处与被迫孤立，强调关键在于连接是否容易，主张在住房、社区和服务上为独处留出空间，而不是强迫人们进入某种家庭形式。B 的 always 与开头相反，C、D 均无依据。'
    },
    {
      q: 'According to the passage, what can make solitude less isolating?',
      options: [
        'A house behind a fence far from public transport.',
        'Rules that penalize single people.',
        'Easy connection through public spaces, libraries, cafes and transport.',
        'Services that enter the home without invitation.'
      ],
      answer: 2,
      explain: '第二段指出，繁忙街道上的单间可能比围栏后的郊区住宅更不孤立，公共空间、图书馆、咖啡馆和可靠交通构成社会基础设施。A 与原文相反，B 是文章批评的做法，D 与“不侵入”相反。'
    },
    {
      q: 'In the last paragraph, the word "intrude" is closest in meaning to ____.',
      options: [
        'check in politely',
        'enter without being welcome',
        'adapt a home',
        'offer financial support'
      ],
      answer: 1,
      explain: 'intrude 指未经允许地进入或打扰。文中说服务应当探望但不 intrude，与“不遗弃”并列，强调关心不能变成对私人空间的侵犯。'
    }
  ]
});
window.READINGS.push({
  id: 'r-soc-3',
  title: 'The Unpaid Work That Holds a Neighborhood Up',
  category: '社会',
  level: 'TOEFL',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'Every week, a volunteer sorts donated food, drives an older neighbor to an appointment, and staffs a helpline that few people notice until they need it. This unpaid work is the connective tissue of a neighborhood, yet it is rarely counted in budgets or planning documents. It is invisible precisely because it works.',
    'Volunteer groups can respond quickly and flexibly. They know who is housebound and which corner is dark. But they depend on a small number of tireless people. When one leaves, a whole network can wobble. Burnout is not a personal failing; it is a structural warning.',
    'Formal institutions often treat volunteers as free labor. That can be efficient, but it can also displace a paid job and burden people who are themselves struggling. Good partnerships fund coordination, training and expenses rather than merely praising goodwill. Support should be reliable enough to be relied upon.',
    'A neighborhood that relies only on volunteers is fragile; one that relies only on agencies is remote. The strongest places combine both, with clear roles and honest funding. Care is infrastructure, even when it arrives in a casserole dish.'
  ],
  translation: [
    '每周，一名志愿者分拣捐赠食物，开车送一位年长邻居去就诊，并守着一条很少有人注意、直到需要时才想起的热线。这些无偿劳动是社区的结缔组织，却很少被计入预算或规划文件。它之所以隐形，恰恰是因为它在运转。',
    '志愿者团体能够快速灵活地回应。他们知道谁行动不便，也知道哪个角落昏暗。但他们依赖少数不知疲倦的人。一旦有人离开，整个网络就可能摇晃。倦怠不是个人失败，而是结构性警告。',
    '正式机构常把志愿者当作免费劳动力。这也许高效，却也可能取代一个有薪岗位，并加重本身就在挣扎的人的负担。好的伙伴关系会资助协调、培训和开支，而不只是赞美善意。支持应当足够可靠，才能被依赖。',
    '一个只依靠志愿者的社区是脆弱的；一个只依靠机构的社区是遥远的。最强的地方把两者结合起来，角色清晰，资金诚实。照护就是基础设施，即使它装在一只砂锅里送来。'
  ],
  vocab: [
    { w: 'volunteer', p: '/ˌvɑːlənˈtɪr/', m: '志愿者' },
    { w: 'helpline', p: '/ˈhelplaɪn/', m: '求助热线' },
    { w: 'housebound', p: '/ˈhaʊsbaʊnd/', m: '行动不便而待在家中的' },
    { w: 'wobble', p: '/ˈwɑːbl/', m: '摇晃；动摇' },
    { w: 'coordination', p: '/koʊˌɔːrdɪˈneɪʃn/', m: '协调；配合' },
    { w: 'displace', p: '/dɪsˈpleɪs/', m: '取代；使失去位置' },
    { w: 'burden', p: '/ˈbɜːrdn/', m: '使负担；负担' },
    { w: 'fragile', p: '/ˈfrædʒəl/', m: '脆弱的' },
    { w: 'casserole', p: '/ˈkæsəroʊl/', m: '砂锅菜；炖锅' },
    { w: 'goodwill', p: '/ˌɡʊdˈwɪl/', m: '善意；友好' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Volunteers should replace all paid public services.',
        'Formal agencies are always more caring than neighbors.',
        'Volunteer work is essential but fragile, and it needs reliable funding and partnership.',
        'Neighborhoods should rely only on volunteers.'
      ],
      answer: 2,
      explain: '文章强调志愿工作像社区的结缔组织，却依赖少数人、容易倦怠，因此需要正式机构提供协调、培训和资金，形成清晰分工。A、D 走极端，B 与文章对机构的批评不符。'
    },
    {
      q: 'Why can a volunteer network be fragile?',
      options: [
        'It has too much government funding.',
        'It depends on a few tireless people, and burnout can break the network.',
        'Volunteers refuse to know their neighbors.',
        'Agencies never cooperate with volunteers.'
      ],
      answer: 1,
      explain: '第二段指出志愿者网络依赖少数不知疲倦的人，一旦有人离开，整个网络就会动摇；倦怠是结构性警告。A 与资金不足的语境无关，C、D 均无依据。'
    },
    {
      q: 'In the third paragraph, the word "displace" is closest in meaning to ____.',
      options: [
        'take the place of',
        'pay in full',
        'train carefully',
        'praise publicly'
      ],
      answer: 0,
      explain: 'displace 指取代、使某物失去原有位置。文中说志愿劳动可能 displace a paid job，即取代原本应有报酬的岗位。'
    }
  ]
});
window.READINGS.push({
  id: 'r-soc-4',
  title: 'The Table at the End of the Street',
  category: '社会',
  level: 'CET-6',
  source: '原创 · 外刊风格',
  license: 'original',
  sourceUrl: '',
  paragraphs: [
    'At noon, a community canteen fills with a retiree, a delivery rider and a parent with small children. The menu is plain, the prices are low, and the tables are shared. What looks like a cheap lunch is also a piece of social policy. The room is doing work that a waiting list cannot do.',
    'Many older residents eat alone, especially after a partner dies. Cooking for one can feel pointless, and appetite follows. A canteen offers nutrition and, just as important, a reason to leave the house and talk to someone. The meal is the pretext; the company is the point.',
    'The model is not self-financing. Rent, wages and food costs exceed what diners pay, so a subsidy or a cross-subsidy from other meals is needed. Eligibility rules can target help, but a visible test may carry a stigma that keeps people away. Dignity is part of the service.',
    'The most successful canteens are open to everyone, not labeled as charity. They hire local cooks, take suggestions and let friendships form. A city can build all the meeting rooms it likes. A shared table does more, because no one has to perform gratitude to belong.'
  ],
  translation: [
    '中午，一家社区食堂坐满了退休老人、外卖骑手和带小孩的家长。菜单朴素，价格低廉，桌子共享。看起来像一顿便宜午餐的东西，也是一项社会政策。这个房间在做等候名单做不到的事。',
    '许多老年居民独自吃饭，尤其是在伴侣去世后。为一个人做饭可能显得没有意义，食欲也随之下降。食堂提供营养，同样重要的是，提供一个出门与人交谈的理由。饭菜是借口，陪伴才是重点。',
    '这种模式无法自负盈亏。租金、工资和食材成本超过就餐者支付的钱，因此需要补贴，或用其他餐食交叉补贴。资格规则可以把帮助对准目标，但可见的审查可能带来污名，把人挡在门外。尊严是服务的一部分。',
    '最成功的食堂向所有人开放，不被标为慈善。他们雇用本地厨师，听取建议，让友谊自然形成。一座城市可以建它想要的任何会议室。一张共享的餐桌能做的更多，因为没有人需要表演感恩才能被接纳。'
  ],
  vocab: [
    { w: 'canteen', p: '/kænˈtiːn/', m: '食堂；小餐馆' },
    { w: 'retiree', p: '/rɪˌtaɪəˈriː/', m: '退休人员' },
    { w: 'appetite', p: '/ˈæpɪtaɪt/', m: '食欲；胃口' },
    { w: 'nutrition', p: '/nuˈtrɪʃn/', m: '营养' },
    { w: 'subsidy', p: '/ˈsʌbsədi/', m: '补贴；补助' },
    { w: 'eligibility', p: '/ˌelɪdʒəˈbɪləti/', m: '资格；合格条件' },
    { w: 'stigma', p: '/ˈstɪɡmə/', m: '污名；耻辱' },
    { w: 'charity', p: '/ˈtʃerəti/', m: '慈善；慈善机构' },
    { w: 'dignity', p: '/ˈdɪɡnəti/', m: '尊严' }
  ],
  questions: [
    {
      q: 'What is the main argument of the passage?',
      options: [
        'Community canteens are mainly a way to sell expensive meals.',
        'Community canteens provide nutrition and social contact and should be open and dignified.',
        'Older people should always cook for themselves.',
        'Charity labels make services more attractive.'
      ],
      answer: 1,
      explain: '文章把社区食堂视为一项社会政策，既解决营养问题，也提供社交机会，并主张向所有人开放、避免污名、维护尊严。A 与低价特征相反，C 与独食困境相反，D 与末段相反。'
    },
    {
      q: 'Why is the canteen model not self-financing?',
      options: [
        'Diners pay more than the cost of the meal.',
        'Local cooks work without pay.',
        'The city covers all costs without limit.',
        'Rent, wages and food costs exceed what diners pay.'
      ],
      answer: 3,
      explain: '第三段明确说，租金、工资和食材成本超过就餐者支付的费用，因此需要补贴或交叉补贴。A 与原文相反，B、C 均无依据。'
    },
    {
      q: 'In the third paragraph, the word "stigma" is closest in meaning to ____.',
      options: [
        'a warm welcome',
        'a low price',
        'a mark of shame or disapproval',
        'a type of menu'
      ],
      answer: 2,
      explain: 'stigma 指污名、耻辱标记。文中说可见的资格审查会带来 stigma，使需要帮助的人不愿前来，因此后面强调尊严是服务的一部分。'
    }
  ]
});
