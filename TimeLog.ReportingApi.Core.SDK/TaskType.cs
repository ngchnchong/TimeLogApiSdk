﻿using System.Xml;

namespace TimeLog.ReportingApi.Core.SDK
{
    public class TaskType
    {
        public TaskType()
        {
            this.Id = -1;
            this.Name = string.Empty;
        }





        public TaskType(XmlNode node, XmlNamespaceManager namespaceManager)
        {
            this.Id = int.Parse(node.Attributes["ID"].InnerText);
            this.Name = node.GetStringSafe("tlp:Name", namespaceManager);
        }


        public static int All
        {
            get
            {
                return 0;
            }
        }


        public int Id { get; set; }
        public string Name { get; set; }

    }
}
